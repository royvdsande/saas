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

function bucketFromHour(hour) {
  const h = Number.isFinite(hour) ? hour : new Date().getUTCHours();
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'midday';
  if (h >= 17 && h < 22) return 'evening';
  return 'night';
}

function normalizeLang(raw) {
  const code = String(raw || '').toLowerCase().split(/[-_]/)[0];
  if (code === 'nl') return 'nl';
  return 'en';
}

// Curated fallback prompts. Low-cringe, introspective, premium tone.
const FALLBACK = {
  en: {
    morning: [
      { q: "Will you truly give it all today?", c: "Begin before you feel ready." },
      { q: "What deserves your full weight today?", c: "Place your effort where it matters." },
      { q: "Are you ready to stop negotiating?", c: "Discipline is a kind of freedom." },
      { q: "What would today look like, fully lived?", c: "Decide, then move." },
      { q: "Is this the version of you that shows up?", c: "You're closer than you think." },
    ],
    midday: [
      { q: "Are you still on your own side?", c: "Realign gently, without judgment." },
      { q: "Where does your focus belong right now?", c: "One thing, done well." },
      { q: "Is this the path, or just the easy one?", c: "Easy rarely gets you there." },
      { q: "Are you moving, or just busy?", c: "Motion is not the same as progress." },
      { q: "What would be brave from here?", c: "Courage is a small next step." },
    ],
    evening: [
      { q: "Are you proud of today?", c: "Honest reflection is a win in itself." },
      { q: "Did you keep the promise to yourself?", c: "Tomorrow begins with tonight." },
      { q: "Was today worthy of you?", c: "You get to decide what matters." },
      { q: "What would you do differently now?", c: "Notice it. Then let it teach you." },
      { q: "Did you give it real effort?", c: "Real effort is enough." },
    ],
    night: [
      { q: "Are you ready to let today go?", c: "Rest is part of the work." },
      { q: "Have you earned your rest?", c: "You've done enough for now." },
      { q: "Can you be gentle with today?", c: "Close the day with grace." },
      { q: "Will tomorrow get your best?", c: "Set the tone before you sleep." },
    ],
  },
  nl: {
    morning: [
      { q: "Ga je vandaag écht alles geven?", c: "Begin voordat je je klaar voelt." },
      { q: "Waar verdient jouw volle aandacht vandaag?", c: "Leg je inzet waar het telt." },
      { q: "Sta je klaar om te stoppen met onderhandelen?", c: "Discipline is een soort vrijheid." },
      { q: "Hoe ziet vandaag eruit, volledig geleefd?", c: "Beslis, en beweeg." },
      { q: "Is dit de versie van jou die komt opdagen?", c: "Je bent dichterbij dan je denkt." },
    ],
    midday: [
      { q: "Sta je nog aan jouw eigen kant?", c: "Stuur rustig bij, zonder oordeel." },
      { q: "Waar hoort jouw focus nu?", c: "Eén ding, goed gedaan." },
      { q: "Is dit de juiste weg, of de makkelijke?", c: "Makkelijk brengt je zelden ver." },
      { q: "Ben je in beweging, of gewoon druk?", c: "Druk zijn is geen vooruitgang." },
      { q: "Wat zou vanaf hier moedig zijn?", c: "Moed is een kleine volgende stap." },
    ],
    evening: [
      { q: "Ben je trots op vandaag?", c: "Eerlijk terugkijken is al een winst." },
      { q: "Heb je je belofte aan jezelf gehouden?", c: "Morgen begint vanavond." },
      { q: "Was vandaag jou waardig?", c: "Jij bepaalt wat belangrijk is." },
      { q: "Wat zou je nu anders doen?", c: "Merk het op. Laat het je leren." },
      { q: "Heb je écht je best gedaan?", c: "Echt je best is genoeg." },
    ],
    night: [
      { q: "Ben je klaar om vandaag los te laten?", c: "Rust hoort bij het werk." },
      { q: "Heb je je rust verdiend?", c: "Je hebt genoeg gedaan voor nu." },
      { q: "Kun je mild zijn voor vandaag?", c: "Sluit de dag af met genade." },
      { q: "Krijgt morgen jouw beste?", c: "Zet de toon voordat je slaapt." },
    ],
  },
};

function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return h;
}

function pickFallback(lang, bucket, seed) {
  const pool = (FALLBACK[lang] && FALLBACK[lang][bucket]) || FALLBACK.en[bucket] || FALLBACK.en.morning;
  const i = Math.abs(hashCode(seed)) % pool.length;
  return { question: pool[i].q, confirmation: pool[i].c };
}

const BUCKET_HINTS = {
  morning: 'early morning — momentum, readiness, intention',
  midday: 'midday — realignment, focus, honest check-in',
  evening: 'evening — reflection, pride, effort honored',
  night: 'late night — rest, release, gentle closure',
};

const LANG_NAMES = { en: 'English', nl: 'Dutch (Nederlands)' };

async function generatePrompt(lang, bucket, seed) {
  if (!openaiApiKey) return pickFallback(lang, bucket, seed);
  try {
    const openai = new OpenAI({ apiKey: openaiApiKey });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.9,
      max_tokens: 120,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You write one short, introspective prompt for a daily check-in app. ' +
            `Write in ${LANG_NAMES[lang] || 'English'}. ` +
            'Tone: calm, mature, premium. Never cheesy, never motivational-poster, never corny. ' +
            'The question must feel like a quiet nudge from a wise friend — honest, a little confronting, never cringe. ' +
            'Avoid clichés ("give 110%", "crush it", "let\'s go"), avoid emojis, avoid exclamation marks. ' +
            'Question: max 8 words. Confirmation: a single grounding line under 10 words, no hype. ' +
            'Return strict JSON: {"question":"…","confirmation":"…"}',
        },
        {
          role: 'user',
          content:
            `Time of day: ${bucket} (${BUCKET_HINTS[bucket]}). ` +
            `Seed (for variety, do not mention): ${seed}. ` +
            `Write a fresh prompt matching the time of day.`,
        },
      ],
    });
    const raw = completion.choices?.[0]?.message?.content || '';
    const parsed = JSON.parse(raw);
    if (parsed?.question && parsed?.confirmation) {
      return {
        question: String(parsed.question).trim(),
        confirmation: String(parsed.confirmation).trim(),
      };
    }
  } catch {
    // Fall through to fallback
  }
  return pickFallback(lang, bucket, seed);
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

async function getTodayPrompt(db, uid, today, lang, bucket) {
  const stateRef = db.collection('users').doc(uid).collection('daily').doc('_state');
  const dayRef = db.collection('users').doc(uid).collection('daily').doc(today);

  const [stateSnap, daySnap] = await Promise.all([stateRef.get(), dayRef.get()]);
  const state = stateSnap.exists ? stateSnap.data() : {};

  // Locked: already answered → show the question they actually answered
  if (daySnap.exists && daySnap.data()?.question) {
    const day = daySnap.data();
    return {
      state,
      question: day.question,
      confirmation: day.confirmation || state.todayConfirmation || '',
      locked: true,
    };
  }

  // Reuse cache for same (date, bucket, lang)
  if (
    state.todayDate === today &&
    state.todayBucket === bucket &&
    state.todayLang === lang &&
    state.todayQuestion &&
    state.todayConfirmation
  ) {
    return {
      state,
      question: state.todayQuestion,
      confirmation: state.todayConfirmation,
      locked: false,
    };
  }

  const seed = `${uid}:${today}:${bucket}:${lang}`;
  const prompt = await generatePrompt(lang, bucket, seed);
  const merged = {
    streak: state.streak || 0,
    lastYesDate: state.lastYesDate || null,
    totalYes: state.totalYes || 0,
    todayDate: today,
    todayBucket: bucket,
    todayLang: lang,
    todayQuestion: prompt.question,
    todayConfirmation: prompt.confirmation,
  };
  await stateRef.set(merged, { merge: true });
  return { state: merged, question: prompt.question, confirmation: prompt.confirmation, locked: false };
}

async function handleFetch(db, uid, lang, bucket) {
  const today = todayUTC();
  const { state, question, confirmation } = await getTodayPrompt(db, uid, today, lang, bucket);
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
    bucket,
    lang,
  };
}

async function handleAnswer(db, uid, answer, lang, bucket) {
  if (answer !== 'yes' && answer !== 'no') {
    throw new Error('Invalid answer');
  }
  const today = todayUTC();
  const dayRef = db.collection('users').doc(uid).collection('daily').doc(today);
  const stateRef = db.collection('users').doc(uid).collection('daily').doc('_state');

  const daySnap = await dayRef.get();
  if (daySnap.exists) {
    return handleFetch(db, uid, lang, bucket);
  }

  const stateSnap = await stateRef.get();
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

  const { question, confirmation } = await getTodayPrompt(db, uid, today, lang, bucket);

  await Promise.all([
    dayRef.set({
      date: today,
      answer,
      question,
      confirmation,
      bucket,
      lang,
      ts: admin.firestore.FieldValue.serverTimestamp(),
    }),
    stateRef.set(
      {
        streak: newStreak,
        lastYesDate,
        totalYes,
        todayDate: today,
        todayBucket: bucket,
        todayLang: lang,
        todayQuestion: question,
        todayConfirmation: confirmation,
      },
      { merge: true }
    ),
  ]);

  return handleFetch(db, uid, lang, bucket);
}

module.exports = async (req, res) => {
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

  const url = new URL(req.url, 'http://localhost');
  const qHour = parseInt(url.searchParams.get('hour') || '', 10);
  const qLang = url.searchParams.get('lang') || '';
  const hdrLang = (req.headers['accept-language'] || '').split(',')[0];

  const lang = normalizeLang(body.lang || qLang || hdrLang);
  const hourRaw = Number.isFinite(body.hour) ? body.hour : (Number.isFinite(qHour) ? qHour : null);
  const bucket = bucketFromHour(Number.isFinite(hourRaw) ? hourRaw : new Date().getUTCHours());

  const action = req.method === 'GET' ? 'fetch' : (body.action || 'fetch');

  try {
    if (action === 'fetch') {
      const data = await handleFetch(db, uid, lang, bucket);
      return respond(res, 200, data);
    }
    if (action === 'answer') {
      const data = await handleAnswer(db, uid, body.answer, lang, bucket);
      return respond(res, 200, data);
    }
    return respond(res, 400, { message: 'Unknown action.' });
  } catch (err) {
    return respond(res, 500, { message: err?.message || 'Server error.' });
  }
};
