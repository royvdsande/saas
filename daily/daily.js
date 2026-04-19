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

const CACHE_KEY = "daily:cache:v1";

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

const els = {
  streak: document.getElementById("daily-streak"),
  question: document.getElementById("daily-question"),
  yes: document.getElementById("daily-btn-yes"),
  no: document.getElementById("daily-btn-no"),
  confirmation: document.getElementById("daily-confirmation"),
  answered: document.getElementById("daily-answered"),
  history: document.getElementById("daily-history"),
};

let currentUid = null;
let isSubmitting = false;

function todayUTC() {
  return new Date().toISOString().slice(0, 10);
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
      question: data.question,
      confirmation: data.confirmation,
      todayAnswer: data.todayAnswer,
      streak: data.streak,
      recentYes: data.recentYes,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // localStorage unavailable — ignore
  }
}

function clearCache() {
  try { localStorage.removeItem(CACHE_KEY); } catch {}
}

function formatStreak(streak) {
  if (!streak) return "Start your streak";
  if (streak === 1) return "1 day streak";
  return `${streak} day streak`;
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

function render(data) {
  if (!data) return;
  els.streak.textContent = formatStreak(data.streak || 0);
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
    els.answered.textContent =
      data.todayAnswer === "yes" ? "Locked in for today." : "See you tomorrow.";
  } else {
    els.answered.hidden = true;
    els.answered.textContent = "";
  }
}

async function fetchState(idToken) {
  const res = await fetch("/api/daily-prompt", {
    method: "GET",
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return res.json();
}

async function submitAnswer(idToken, answer) {
  const res = await fetch("/api/daily-prompt", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action: "answer", answer }),
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
    render(data);
    writeCache(currentUid, data);
  } catch {
    // Re-enable on failure so user can retry
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

  const cached = readCache();
  if (cached && cached.uid === currentUid && cached.date === todayUTC()) {
    render({
      question: cached.question,
      confirmation: cached.confirmation,
      todayAnswer: cached.todayAnswer,
      streak: cached.streak,
      recentYes: cached.recentYes,
      today: cached.date,
    });
  }

  try {
    const idToken = await user.getIdToken();
    const data = await fetchState(idToken);
    render(data);
    writeCache(currentUid, data);
  } catch {
    if (!cached) {
      els.question.textContent = "Couldn't load today's prompt.";
      els.confirmation.textContent = "Try refreshing in a moment.";
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
