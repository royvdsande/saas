import {
  initializeApp,
  getApps,
  getApp,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBgXo3zllXtFJZDn4elpY8DemEQG_ltMk0",
  authDomain: "account.binas.app",
  projectId: "binas-91a32",
  storageBucket: "binas-91a32.firebasestorage.app",
  messagingSenderId: "971498903694",
  appId: "1:971498903694:web:5ab8b630b183f5204ed1df",
  measurementId: "G-1LLBGZNRNC",
};

const CACHE_KEY = "daily:cache:v2";

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

const els = {
  body: document.body,
  streakText: document.getElementById("daily-streak-text"),
  question: document.getElementById("daily-question"),
  yes: document.getElementById("daily-btn-yes"),
  no: document.getElementById("daily-btn-no"),
  confirmation: document.getElementById("daily-confirmation"),
  answered: document.getElementById("daily-answered"),
  history: document.getElementById("daily-history"),
};

let currentUid = null;
let isSubmitting = false;
let currentLang = "en";

// i18n — just a few strings; question/confirmation come from server
const STRINGS = {
  en: {
    loading: "Loading",
    startStreak: "Start your streak",
    dayStreak: (n) => (n === 1 ? "1 day streak" : `${n} day streak`),
    lockedYes: "Locked in for today",
    lockedNo: "See you tomorrow",
    preparing: "Preparing today's prompt…",
    failed: "Couldn't load today's prompt",
    retryHint: "Try refreshing in a moment",
    yes: "Yes",
    no: "No",
  },
  nl: {
    loading: "Laden",
    startStreak: "Start je streak",
    dayStreak: (n) => (n === 1 ? "1 dag streak" : `${n} dagen streak`),
    lockedYes: "Vastgelegd voor vandaag",
    lockedNo: "Tot morgen",
    preparing: "Vraag van vandaag wordt gemaakt…",
    failed: "Vraag van vandaag kon niet laden",
    retryHint: "Probeer zo opnieuw",
    yes: "Ja",
    no: "Nee",
  },
};

function detectLang() {
  const raw = (navigator.language || navigator.userLanguage || "en").toLowerCase();
  const code = raw.split(/[-_]/)[0];
  return code === "nl" ? "nl" : "en";
}

function t() {
  return STRINGS[currentLang] || STRINGS.en;
}

function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

function localHour() {
  return new Date().getHours();
}

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeCache(uid, data) {
  try {
    const payload = {
      uid,
      date: data.today,
      bucket: data.bucket,
      lang: data.lang,
      question: data.question,
      confirmation: data.confirmation,
      todayAnswer: data.todayAnswer,
      streak: data.streak,
      recentYes: data.recentYes,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

function clearCache() {
  try { localStorage.removeItem(CACHE_KEY); } catch {}
}

function bucketFromHour(h) {
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "midday";
  if (h >= 17 && h < 22) return "evening";
  return "night";
}

function formatStreak(streak) {
  const s = t();
  if (!streak) return s.startStreak;
  return s.dayStreak(streak);
}

function renderHistory(recentYes, today) {
  const yesSet = new Set(recentYes || []);
  const cells = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const classes = ["daily-dot"];
    if (yesSet.has(iso)) classes.push("is-yes");
    if (iso === today) classes.push("is-today");
    cells.push(`<div class="${classes.join(" ")}" title="${iso}"></div>`);
  }
  els.history.innerHTML = cells.join("");
}

function setLabels() {
  const s = t();
  els.yes.textContent = s.yes;
  els.no.textContent = s.no;
  els.streakText.textContent = s.loading;
}

function setLoading(isLoading) {
  els.body.classList.toggle("is-loading-state", isLoading);
  els.question.classList.toggle("is-loading", isLoading);
  if (isLoading) {
    // Keep skeleton until first real render
  } else {
    // Remove any shimmer markers
  }
}

function renderSkeleton() {
  els.question.innerHTML =
    '<span class="skeleton-line" style="display:inline-block;width:320px;max-width:90%;height:1.1em;vertical-align:middle"></span>';
  els.confirmation.textContent = t().preparing;
  els.streakText.textContent = t().loading;
  els.yes.disabled = true;
  els.no.disabled = true;
  setLoading(true);
}

function render(data, { animate = false } = {}) {
  if (!data) return;
  setLoading(false);

  // Optional re-trigger of entrance animation on fresh data
  if (animate) {
    [els.streakText.parentElement, els.question, els.yes.parentElement, els.confirmation, els.history]
      .filter(Boolean)
      .forEach((el) => {
        el.style.animation = "none";
        // force reflow so the animation can replay
        // eslint-disable-next-line no-unused-expressions
        el.offsetHeight;
        el.style.animation = "";
      });
  }

  els.streakText.textContent = formatStreak(data.streak || 0);
  els.question.textContent = data.question || "";
  els.confirmation.textContent = data.confirmation || "";

  const today = data.today || todayUTC();
  renderHistory(data.recentYes || [], today);

  const answered = data.todayAnswer === "yes" || data.todayAnswer === "no";
  els.yes.disabled = answered || isSubmitting;
  els.no.disabled = answered || isSubmitting;
  els.yes.classList.toggle("is-selected", data.todayAnswer === "yes");
  els.no.classList.toggle("is-selected", data.todayAnswer === "no");

  if (answered) {
    els.answered.hidden = false;
    els.answered.textContent = data.todayAnswer === "yes" ? t().lockedYes : t().lockedNo;
  } else {
    els.answered.hidden = true;
    els.answered.textContent = "";
  }
}

function clientParams() {
  return {
    lang: detectLang(),
    hour: localHour(),
  };
}

async function fetchState(idToken) {
  const { lang, hour } = clientParams();
  const url = `/api/daily-prompt?lang=${encodeURIComponent(lang)}&hour=${encodeURIComponent(hour)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return res.json();
}

async function submitAnswer(idToken, answer) {
  const { lang, hour } = clientParams();
  const res = await fetch("/api/daily-prompt", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action: "answer", answer, lang, hour }),
  });
  if (!res.ok) throw new Error(`Submit failed: ${res.status}`);
  return res.json();
}

async function handleAnswerClick(answer) {
  if (isSubmitting) return;
  const user = auth.currentUser;
  if (!user) return;

  isSubmitting = true;
  els.yes.disabled = true;
  els.no.disabled = true;
  (answer === "yes" ? els.yes : els.no).classList.add("is-selected");

  try {
    const idToken = await user.getIdToken();
    const data = await submitAnswer(idToken, answer);
    currentLang = data.lang || currentLang;
    render(data);
    writeCache(currentUid, data);
  } catch {
    els.yes.disabled = false;
    els.no.disabled = false;
    els.yes.classList.remove("is-selected");
    els.no.classList.remove("is-selected");
  } finally {
    isSubmitting = false;
  }
}

function bindButtons() {
  els.yes.addEventListener("click", () => handleAnswerClick("yes"));
  els.no.addEventListener("click", () => handleAnswerClick("no"));
}

async function bootForUser(user) {
  currentUid = user.uid;
  currentLang = detectLang();
  setLabels();

  // Attempt cache-first render for instant paint
  const cached = readCache();
  const today = todayUTC();
  const currentBucket = bucketFromHour(localHour());

  const cacheFresh =
    cached &&
    cached.uid === currentUid &&
    cached.date === today &&
    cached.bucket === currentBucket &&
    cached.lang === currentLang;

  if (cacheFresh) {
    render({
      question: cached.question,
      confirmation: cached.confirmation,
      todayAnswer: cached.todayAnswer,
      streak: cached.streak,
      recentYes: cached.recentYes,
      today: cached.date,
      bucket: cached.bucket,
      lang: cached.lang,
    });
  } else {
    renderSkeleton();
  }

  try {
    const idToken = await user.getIdToken();
    const data = await fetchState(idToken);
    currentLang = data.lang || currentLang;
    setLabels();
    render(data, { animate: !cacheFresh });
    writeCache(currentUid, data);
  } catch {
    if (!cacheFresh) {
      setLoading(false);
      els.question.textContent = t().failed;
      els.confirmation.textContent = t().retryHint;
    }
  }
}

bindButtons();

onAuthStateChanged(auth, (user) => {
  if (!user) {
    clearCache();
    window.location.replace("/auth/login?next=/daily");
    return;
  }
  bootForUser(user);
});
