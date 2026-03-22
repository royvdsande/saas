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

  // Auth (optional — onboarding works without login)
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  let uid = null;
  if (token) {
    const jwtPayload = decodeJwtPayload(token);
    uid = jwtPayload?.user_id || jwtPayload?.sub || null;
  }

  // Parse body
  let body = {};
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString();
    if (raw) body = JSON.parse(raw);
  } catch {
    return respond(res, 400, { message: 'Invalid request body.' });
  }

  const { goal, activityLevel, gender, age, weight, height } = body;
  if (!goal || !activityLevel || !gender || !age || !weight || !height) {
    return respond(res, 400, { message: 'Missing required fields: goal, activityLevel, gender, age, weight, height.' });
  }

  // Calculate BMR (Mifflin-St Jeor) and TDEE for personalized calorie targets
  const bmrMale = 10 * weight + 6.25 * height - 5 * age + 5;
  const bmrFemale = 10 * weight + 6.25 * height - 5 * age - 161;
  const bmr = gender === 'male' ? bmrMale : gender === 'female' ? bmrFemale : (bmrMale + bmrFemale) / 2;

  const activityMultipliers = {
    'sedentary': 1.2,
    'lightly-active': 1.375,
    'moderately-active': 1.55,
    'very-active': 1.725,
    'athlete': 1.9,
  };
  const tdee = Math.round(bmr * (activityMultipliers[activityLevel] || 1.55));

  const goalAdjustments = {
    'lose-weight': -400,
    'build-muscle': 300,
    'get-fitter': 0,
    'boost-endurance': -100,
  };
  const targetCalories = tdee + (goalAdjustments[goal] || 0);
  const proteinTarget = goal === 'build-muscle' ? Math.round(weight * 2.2) : Math.round(weight * 1.6);

  const goalDescriptions = {
    'lose-weight': 'fat loss with a caloric deficit, focusing on cardio and compound movements, high protein to preserve muscle',
    'build-muscle': 'muscle hypertrophy with a caloric surplus, focusing on progressive overload and strength training, high protein intake',
    'get-fitter': 'overall fitness improvement with balanced cardio and strength, moderate calorie intake',
    'boost-endurance': 'cardiovascular endurance with a slight deficit, focusing on aerobic training, balanced macros',
  };
  const goalDesc = goalDescriptions[goal] || 'overall fitness improvement';

  const systemPrompt = `You are an expert fitness and nutrition coach. Return ONLY valid JSON (no markdown, no explanation).
Schema: {"training":[{"day":"Monday","exercises":[{"name":"string","sets":3,"reps":12,"rest":"60s"}]}],"nutrition":[{"day":"Monday","meals":{"breakfast":"string","lunch":"string","dinner":"string","snacks":"string"},"kcal":2200}],"summary":"motivational 2-sentence summary personalised to the user's goal and stats","dailyCalories":${targetCalories},"tips":["tip1","tip2","tip3"]}
Rules:
- Generate a complete 7-day plan (Monday-Sunday)
- Every nutrition day MUST include all four meal keys: breakfast, lunch, dinner, snacks — never omit or leave them empty
- Use EXACTLY ${targetCalories} kcal as the dailyCalories value
- Tailor the plan for: ${goalDesc}
- Vary exercises and meals across the 7 days — no repeated days
- Be specific: use real exercise names, real food items with portions`;

  const userPrompt = `Goal: ${goal}. Activity level: ${activityLevel}. Gender: ${gender}. Age: ${age}. Weight: ${weight}kg. Height: ${height}cm. Target calories: ${targetCalories} kcal/day. Protein target: ${proteinTarget}g/day.`;

  try {
    const openai = new OpenAI({ apiKey: openaiApiKey });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 4000,
      temperature: 0.8,
    });

    const raw = response.choices[0]?.message?.content || '';

    // Parse the JSON response
    let plan;
    try {
      // Strip any markdown code fences if present
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      plan = JSON.parse(cleaned);
    } catch {
      return respond(res, 500, { message: 'AI returned invalid format. Please try again.' });
    }

    // Save to Firestore if available and user is authenticated
    if (admin.apps.length && uid) {
      try {
        const db = admin.firestore();
        await db.collection('users').doc(uid).set({
          plan,
          planProfile: { goal, activityLevel, gender, age, weight, height },
          planGeneratedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      } catch {
        // Non-fatal — plan still returned to client
      }
    }

    return respond(res, 200, { plan });
  } catch (error) {
    return respond(res, 500, { message: 'Could not generate your plan. Please try again.' });
  }
};
