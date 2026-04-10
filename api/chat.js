const OpenAI = require('openai');
const admin = require('firebase-admin');

const openaiApiKey = process.env.OPENAI_API_KEY;
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;

// Initialize Firebase Admin (shared across invocations)
if (!admin.apps.length && serviceAccount) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(serviceAccount)),
    });
  } catch {
    // Firebase init failed — will proceed without Firestore
  }
}

function decodeJwtPayload(token) {
  try {
    const payload = token.split('.')[1];
    const decoded = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function respond(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return respond(res, 405, { message: 'Method Not Allowed' });
  }

  if (!openaiApiKey) {
    return respond(res, 500, { message: 'OpenAI API key missing from configuration.' });
  }

  // Decode JWT to get user uid and email
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  if (!token) {
    return respond(res, 401, { message: 'Authentication required.' });
  }

  const jwtPayload = token ? decodeJwtPayload(token) : null;
  const uid = jwtPayload?.user_id || jwtPayload?.sub || null;
  const userEmail = jwtPayload?.email || null;

  let body = {};
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString();
    if (raw) body = JSON.parse(raw);
  } catch {
    return respond(res, 400, { message: 'Invalid request body.' });
  }

  const { messages } = body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return respond(res, 400, { message: 'No messages provided.' });
  }

  // Fetch user's fitness plan from Firestore
  let fitnessContext = 'No fitness plan available yet.';
  if (admin.apps.length && uid) {
    try {
      const db = admin.firestore();
      const userDoc = await db.collection('users').doc(uid).get();
      if (userDoc.exists) {
        const data = userDoc.data();
        const plan = data?.plan;
        const profile = data?.planProfile;

        if (plan && profile) {
          const goal = profile.goal || 'general fitness';
          const activityLevel = profile.activityLevel || 'moderately-active';
          const dailyCalories = plan.dailyCalories || profile.targetCalories || 'unknown';
          const macros = plan.dailyMacros || {};
          const protein = macros.protein || profile.proteinTarget || 'unknown';
          const carbs = macros.carbs || profile.carbTarget || 'unknown';
          const fat = macros.fat || profile.fatTarget || 'unknown';
          const workoutSplit = profile.workoutSplit || 'balanced';
          const workoutFrequency = profile.workoutFrequency || 4;
          const dietaryPreference = profile.dietaryPreference || 'no preference';

          // Build training schedule summary
          const trainingSummary = Array.isArray(plan.training)
            ? plan.training.map(d => `  - ${d.day}: ${d.label}`).join('\n')
            : 'Not available';

          // Build tips
          const tips = Array.isArray(plan.tips) ? plan.tips.join(', ') : '';

          fitnessContext = `
USER FITNESS PROFILE:
- Goal: ${goal}
- Activity level: ${activityLevel}
- Workout frequency: ${workoutFrequency} days/week
- Workout split: ${workoutSplit}
- Dietary preference: ${dietaryPreference}

DAILY NUTRITION TARGETS:
- Calories: ${dailyCalories} kcal
- Protein: ${protein}g
- Carbohydrates: ${carbs}g
- Fat: ${fat}g

WEEKLY TRAINING SCHEDULE:
${trainingSummary}

PLAN SUMMARY:
${plan.summary || 'No summary available.'}

${plan.personalNote ? `PERSONAL NOTE:\n${plan.personalNote}` : ''}

${tips ? `KEY TIPS:\n${tips}` : ''}`.trim();
        } else if (plan) {
          fitnessContext = 'User has a fitness plan but no profile details available.';
        }
      }
    } catch {
      // Non-fatal — proceed without fitness context
    }
  }

  const greeting = userEmail ? `The user's email is ${userEmail}.` : '';

  const systemPrompt = `You are a personal AI fitness coach for FitFlow. You help users with their training, nutrition, and general fitness questions. You have access to the user's personalized fitness plan and profile.

${greeting}

${fitnessContext}

Be concise, motivating, and practical. When answering questions about the user's plan, refer to the specific details above. If the user asks about a specific day's workout or meal, give detailed guidance based on their plan. If they ask something outside your knowledge, say so honestly. Always keep your tone supportive and energetic.`;

  try {
    const openai = new OpenAI({ apiKey: openaiApiKey });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.slice(-20),
      ],
      max_tokens: 800,
      temperature: 0.7,
    });

    const reply = response.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
    return respond(res, 200, { message: reply });
  } catch (error) {
    return respond(res, 500, { message: 'Could not reach the AI service. Please try again.' });
  }
};
