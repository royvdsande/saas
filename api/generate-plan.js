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

  // Auth
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  if (!token) {
    return respond(res, 401, { message: 'Authentication required.' });
  }

  const jwtPayload = decodeJwtPayload(token);
  const uid = jwtPayload?.user_id || jwtPayload?.sub || null;
  if (!uid) {
    return respond(res, 401, { message: 'Invalid token.' });
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

  // Efficient system prompt — minimal tokens, structured output
  const systemPrompt = `You are a fitness AI. Return ONLY valid JSON (no markdown, no explanation).
Schema: {"training":[{"day":"Monday","exercises":[{"name":"string","sets":3,"reps":12,"rest":"60s"}]}],"nutrition":[{"day":"Monday","meals":{"breakfast":"string","lunch":"string","dinner":"string","snacks":"string"},"kcal":2200}],"summary":"motivational 2-sentence summary","dailyCalories":2200,"tips":["tip1","tip2","tip3"]}
Generate a complete 7-day plan (Monday-Sunday). Be specific with exercise names and meal descriptions.`;

  const userPrompt = `Goal: ${goal}. Activity level: ${activityLevel}. Gender: ${gender}. Age: ${age}. Weight: ${weight}kg. Height: ${height}cm.`;

  try {
    const openai = new OpenAI({ apiKey: openaiApiKey });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 2000,
      temperature: 0.7,
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

    // Save to Firestore if available
    if (admin.apps.length) {
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
