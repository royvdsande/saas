const OpenAI = require('openai');
const admin = require('firebase-admin');

const openaiApiKey = process.env.OPENAI_API_KEY;
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!admin.apps.length && serviceAccount) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(serviceAccount)),
    });
  } catch {
    // Firebase init failed — endpoint will respond with 500
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

function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

function dayOffsetUTC(baseISO, offsetDays) {
  const d = new Date(baseISO + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

const FALLBACK_PROMPTS = [
  { question: "Are you giving it all today?", confirmation: "Whatever you choose, mean it." },
  { question: "Do you really want it?", confirmation: "Wanting is the first step." },
  { question: "Will you show up today?", confirmation: "Showing up is half the work." },
  { question: "Is today worth your best?", confirmation: "Your best is enough." },
  { question: "Are you here for it?", confirmation: "Presence beats intensity." },
  { question: "Will you keep your word?", confirmation: "A promise to yourself counts most." },
  { question: "Ready to do the hard thing?", confirmation: "Hard now, easy later." },
  { question: "Are you choosing growth?", confirmation: "Growth lives outside comfort." },
  { question: "Will you start anyway?", confirmation: "Momentum follows action." },
  { question: "Is this the day you decide?", confirmation: "Decisions shape who you become." },
  { question: "Do you trust the process?", confirmation: "Trust compounds quietly." },
  { question: "Will you finish what you start?", confirmation: "Completion builds character." },
  { question: "Are you proud of today's plan?", confirmation: "Pride begins with intention." },
  { question: "Will you protect your focus?", confirmation: "Focus is a finite gift." },
  { question: "Are you all in today?", confirmation: "All in beats half measures." },
];

function pickFallback(seed) {
  const i = Math.abs(hashCode(seed)) % FALLBACK_PROMPTS.length;
  return FALLBACK_PROMPTS[i];
}

function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return h;
}

async function generatePrompt(seed) {
  if (!openaiApiKey) return pickFallback(seed);
  try {
    const openai = new OpenAI({ apiKey: openaiApiKey });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.9,
      max_tokens: 80,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'Generate ONE short English question (max 8 words) in a calm, premium, introspective tone. ' +
            'Examples: "Are you giving it all today?", "Do you really want it?". ' +
            'Then a one-line affirmation under 10 words. ' +
            'Return JSON: {"question":"…","confirmation":"…"}',
        },
        { role: 'user', content: `Seed: ${seed}. Generate a fresh, original prompt in the same spirit.` },
      ],
    });
    const raw = completion.choices?.[0]?.message?.content || '';
    const parsed = JSON.parse(raw);
    if (parsed?.question && parsed?.confirmation) {
      return { question: String(parsed.question).trim(), confirmation: String(parsed.confirmation).trim() };
    }
  } catch {
    // Fall through to fallback
  }
  return pickFallback(seed);
}

async function loadRecentYes(db, uid, limit = 30) {
  try {
    const snap = await db
      .collection('users').doc(uid).collection('daily')
      .orderBy('date', 'desc').limit(limit).get();
    const dates = [];
    snap.forEach((doc) => {
      const data = doc.data();
      if (data?.answer === 'yes' && data?.date) dates.push(data.date);
    });
    return dates;
  } catch {
    return [];
  }
}

async function getOrCreateTodayPrompt(db, uid, today) {
  const stateRef = db.collection('users').doc(uid).collection('daily').doc('_state');
  const stateSnap = await stateRef.get();
  const state = stateSnap.exists ? stateSnap.data() : {};

  if (state.todayDate === today && state.todayQuestion && state.todayConfirmation) {
    return { state, question: state.todayQuestion, confirmation: state.todayConfirmation };
  }

  const seed = `${uid}:${today}`;
  const prompt = await generatePrompt(seed);
  const merged = {
    streak: state.streak || 0,
    lastYesDate: state.lastYesDate || null,
    totalYes: state.totalYes || 0,
    todayDate: today,
    todayQuestion: prompt.question,
    todayConfirmation: prompt.confirmation,
  };
  await stateRef.set(merged, { merge: true });
  return { state: merged, question: prompt.question, confirmation: prompt.confirmation };
}

async function handleFetch(db, uid) {
  const today = todayUTC();
  const { state, question, confirmation } = await getOrCreateTodayPrompt(db, uid, today);
  const dayRef = db.collection('users').doc(uid).collection('daily').doc(today);
  const daySnap = await dayRef.get();
  const todayAnswer = daySnap.exists ? (daySnap.data()?.answer || null) : null;
  const recentYes = await loadRecentYes(db, uid, 30);
  return {
    question,
    confirmation,
    todayAnswer,
    streak: state.streak || 0,
    lastYesDate: state.lastYesDate || null,
    totalYes: state.totalYes || 0,
    recentYes,
    today,
  };
}

async function handleAnswer(db, uid, answer) {
  if (answer !== 'yes' && answer !== 'no') {
    throw new Error('Invalid answer');
  }
  const today = todayUTC();
  const dayRef = db.collection('users').doc(uid).collection('daily').doc(today);
  const stateRef = db.collection('users').doc(uid).collection('daily').doc('_state');

  const [daySnap, stateSnap] = await Promise.all([dayRef.get(), stateRef.get()]);

  // Idempotent: if today is already answered, just return current state
  if (daySnap.exists) {
    return handleFetch(db, uid);
  }

  const state = stateSnap.exists ? stateSnap.data() : {};
  const yesterday = dayOffsetUTC(today, -1);

  let newStreak = state.streak || 0;
  let lastYesDate = state.lastYesDate || null;
  let totalYes = state.totalYes || 0;

  if (answer === 'yes') {
    newStreak = lastYesDate === yesterday ? (state.streak || 0) + 1 : 1;
    lastYesDate = today;
    totalYes += 1;
  } else {
    newStreak = 0;
  }

  // Make sure today's question is set
  const { question, confirmation } = await getOrCreateTodayPrompt(db, uid, today);

  await Promise.all([
    dayRef.set({
      date: today,
      answer,
      question,
      ts: admin.firestore.FieldValue.serverTimestamp(),
    }),
    stateRef.set(
      {
        streak: newStreak,
        lastYesDate,
        totalYes,
        todayDate: today,
        todayQuestion: question,
        todayConfirmation: confirmation,
      },
      { merge: true }
    ),
  ]);

  return handleFetch(db, uid);
}

module.exports = async (req, res) => {
  // CORS-safe single origin (same origin, but handle OPTIONS gracefully)
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return respond(res, 405, { message: 'Method Not Allowed' });
  }

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

  if (!admin.apps.length) {
    return respond(res, 500, { message: 'Server not configured.' });
  }
  const db = admin.firestore();

  let body = {};
  if (req.method === 'POST') {
    try {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const raw = Buffer.concat(chunks).toString();
      if (raw) body = JSON.parse(raw);
    } catch {
      return respond(res, 400, { message: 'Invalid request body.' });
    }
  }

  const action = req.method === 'GET' ? 'fetch' : (body.action || 'fetch');

  try {
    if (action === 'fetch') {
      const data = await handleFetch(db, uid);
      return respond(res, 200, data);
    }
    if (action === 'answer') {
      const data = await handleAnswer(db, uid, body.answer);
      return respond(res, 200, data);
    }
    return respond(res, 400, { message: 'Unknown action.' });
  } catch (err) {
    return respond(res, 500, { message: err?.message || 'Server error.' });
  }
};
