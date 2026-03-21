import {
  initializeApp,
  getApps,
  getApp,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import BINAS_CONFIG from "../../config.js";

// Firebase init
const firebaseConfig = {
  apiKey: "AIzaSyBgXo3zllXtFJZDn4elpY8DemEQG_ltMk0",
  authDomain: BINAS_CONFIG?.authDomain || "account.binas.app",
  projectId: "binas-91a32",
  storageBucket: "binas-91a32.firebasestorage.app",
  messagingSenderId: "971498903694",
  appId: "1:971498903694:web:5ab8b630b183f5204ed1df",
};
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

// State
const state = {
  step: 1,
  goal: null,
  activityLevel: null,
  gender: null,
  age: null,
  weight: null,
  height: null,
  user: null,
};

// Elements
const progressBar = document.getElementById("ob-progress");
const steps = [1, 2, 3, 4, 5].map((n) => document.getElementById(`ob-step-${n}`));

function setProgress(pct) {
  progressBar.style.width = pct + "%";
}

function goToStep(n) {
  const current = steps[state.step - 1];
  const next = steps[n - 1];
  if (!current || !next) return;

  current.classList.add("ob-slide-out");
  setTimeout(() => {
    current.classList.remove("active", "ob-slide-out");
    next.classList.add("active");
    state.step = n;
    setProgress(n <= 4 ? (n / 4) * 100 : 100);
  }, 280);
}

// --- Step 1: Goals ---
document.querySelectorAll("#ob-goals .ob-card").forEach((card) => {
  card.addEventListener("click", () => {
    document.querySelectorAll("#ob-goals .ob-card").forEach((c) => c.classList.remove("selected"));
    card.classList.add("selected");
    state.goal = card.dataset.value;
    // Auto-advance after short delay
    setTimeout(() => goToStep(2), 350);
  });
});

// --- Step 2: Activity ---
document.querySelectorAll("#ob-activity .ob-pill").forEach((pill) => {
  pill.addEventListener("click", () => {
    document.querySelectorAll("#ob-activity .ob-pill").forEach((p) => p.classList.remove("selected"));
    pill.classList.add("selected");
    state.activityLevel = pill.dataset.value;
    setTimeout(() => goToStep(3), 350);
  });
});

document.getElementById("ob-back-2")?.addEventListener("click", () => goToStep(1));

// --- Step 3: Stats ---
document.querySelectorAll("#ob-gender .ob-gender-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#ob-gender .ob-gender-btn").forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");
    state.gender = btn.dataset.value;
    validateStep3();
  });
});

const ageInput = document.getElementById("ob-age");
const weightInput = document.getElementById("ob-weight");
const heightInput = document.getElementById("ob-height");
const generateBtn = document.getElementById("ob-generate");

function validateStep3() {
  state.age = ageInput.value ? parseInt(ageInput.value) : null;
  state.weight = weightInput.value ? parseInt(weightInput.value) : null;
  state.height = heightInput.value ? parseInt(heightInput.value) : null;
  const valid = state.gender && state.age && state.weight && state.height;
  generateBtn.disabled = !valid;
}

[ageInput, weightInput, heightInput].forEach((input) => {
  input.addEventListener("input", validateStep3);
});

document.getElementById("ob-back-3")?.addEventListener("click", () => goToStep(2));

generateBtn.addEventListener("click", () => {
  goToStep(4);
  generatePlan();
});

// --- Step 4: Generate Plan ---
async function generatePlan() {
  try {
    const user = state.user;
    if (!user) {
      window.location.replace("/auth/login.html");
      return;
    }

    const token = await user.getIdToken();
    const res = await fetch("/api/generate-plan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        goal: state.goal,
        activityLevel: state.activityLevel,
        gender: state.gender,
        age: state.age,
        weight: state.weight,
        height: state.height,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Request failed");
    }

    const data = await res.json();
    renderResults(data.plan);
    goToStep(5);
  } catch (err) {
    // Show error in step 4
    const step4 = document.getElementById("ob-step-4");
    step4.querySelector(".ob-step-inner").innerHTML = `
      <div class="ob-error">
        <h2>Something went wrong</h2>
        <p>${err.message || "Could not generate your plan. Please try again."}</p>
        <button class="btn btn-accent" onclick="location.reload()">Try again</button>
      </div>
    `;
  }
}

// --- Step 5: Render Results ---
function renderResults(plan) {
  if (!plan) return;

  // Summary
  document.getElementById("ob-summary").textContent = plan.summary || "Your personalized plan is ready!";

  // Stats
  document.getElementById("ob-stat-calories").textContent = plan.dailyCalories || "—";
  const totalExercises = (plan.training || []).reduce((sum, d) => sum + (d.exercises?.length || 0), 0);
  document.getElementById("ob-stat-exercises").textContent = totalExercises;

  // Tips
  const tipsContainer = document.getElementById("ob-tips");
  (plan.tips || []).forEach((tip) => {
    const el = document.createElement("div");
    el.className = "ob-tip";
    el.textContent = tip;
    tipsContainer.appendChild(el);
  });

  // Training Plan
  const trainingContainer = document.getElementById("ob-training-plan");
  (plan.training || []).forEach((day, i) => {
    const card = document.createElement("div");
    card.className = "ob-day-card" + (i >= 2 ? " ob-blurred" : "");
    card.innerHTML = `
      <div class="ob-day-header">
        <span>${day.day}</span>
        ${i < 2 ? '<span class="ob-day-badge">Preview</span>' : ""}
      </div>
      <div class="ob-day-body">
        ${(day.exercises || [])
          .map(
            (ex) => `
          <div class="ob-exercise">
            <span class="ob-ex-name">${ex.name}</span>
            <span class="ob-ex-detail">${ex.sets} &times; ${ex.reps} &bull; ${ex.rest}</span>
          </div>
        `
          )
          .join("")}
      </div>
    `;
    trainingContainer.appendChild(card);
  });

  // Nutrition Plan
  const nutritionContainer = document.getElementById("ob-nutrition-plan");
  (plan.nutrition || []).forEach((day, i) => {
    const meals = day.meals || {};
    const card = document.createElement("div");
    card.className = "ob-day-card" + (i >= 1 ? " ob-blurred" : "");
    card.innerHTML = `
      <div class="ob-day-header">
        <span>${day.day}</span>
        <span style="font-size:12px;color:var(--gray-500);font-weight:500">${day.kcal || "—"} kcal</span>
      </div>
      <div class="ob-day-body">
        ${["breakfast", "lunch", "dinner", "snacks"]
          .filter((key) => meals[key])
          .map(
            (key) => `
          <div class="ob-meal">
            <div class="ob-meal-label">${key}</div>
            <div class="ob-meal-text">${meals[key]}</div>
          </div>
        `
          )
          .join("")}
      </div>
    `;
    nutritionContainer.appendChild(card);
  });

  // Show paywall for non-premium users
  const paywall = document.getElementById("ob-paywall");
  paywall.classList.add("active");
}

// --- Unlock button → Stripe checkout ---
document.getElementById("ob-unlock-btn")?.addEventListener("click", async () => {
  try {
    const user = state.user;
    if (!user) return;

    const token = await user.getIdToken();
    const priceId = BINAS_CONFIG?.plans?.[1]?.monthlyPriceId || BINAS_CONFIG?.stripePriceId;

    const res = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ priceId }),
    });

    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    }
  } catch {
    // Fallback to pricing page
    window.location.href = "/pricing.html";
  }
});

// --- Auth listener ---
setProgress(25);

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.replace("/auth/signup.html");
    return;
  }
  state.user = user;
});
