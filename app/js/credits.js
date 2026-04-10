import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  addDoc,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { state, BINAS_CONFIG } from "./state.js";
import { setStatus, setLoadingState } from "./utils.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}

function setNumber(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = value !== null && value !== undefined ? String(value) : "0";
}

// ── Load credits from Firestore ───────────────────────────────────────────────

export async function renderCreditsView() {
  if (!state.currentUser || !state.firestore) return;

  // Show skeleton while loading
  const balanceEl = document.getElementById("credits-balance-number");
  if (balanceEl) {
    balanceEl.innerHTML = `<span class="skeleton" style="display:inline-block;width:32px;height:36px;border-radius:6px"></span>`;
  }
  setNumber("credits-stat-purchased", "—");
  setNumber("credits-stat-bonus", "—");
  setNumber("credits-stat-used", "—");

  const activityBody = document.getElementById("credits-activity-body");
  if (activityBody) {
    activityBody.innerHTML = `<div class="credits-loading-row"><span class="skeleton" style="height:20px;width:60%;display:block;border-radius:4px"></span><span class="skeleton" style="height:20px;width:30%;display:block;border-radius:4px"></span></div>`;
  }

  try {
    const uid = state.currentUser.uid;
    const db = state.firestore;

    // Load credits summary from customer doc
    const customerRef = doc(db, "customers", uid);
    const customerSnap = await getDoc(customerRef);
    const credits = customerSnap.exists() ? (customerSnap.data().credits || {}) : {};

    const purchased = credits.purchased ?? 0;
    const bonus = credits.bonus ?? 0;
    const used = credits.used ?? 0;
    const available = purchased + bonus - used;

    // Update balance display
    if (balanceEl) balanceEl.textContent = available;
    setNumber("credits-stat-purchased", purchased);
    setNumber("credits-stat-bonus", bonus);
    setNumber("credits-stat-used", used);

    // Load recent transactions
    await loadCreditActivity(uid, db, activityBody);
  } catch {
    if (balanceEl) balanceEl.textContent = "0";
    setNumber("credits-stat-purchased", 0);
    setNumber("credits-stat-bonus", 0);
    setNumber("credits-stat-used", 0);
    if (activityBody) {
      activityBody.innerHTML = `<div class="credits-empty-state"><p>No activity yet.</p></div>`;
    }
  }
}

async function loadCreditActivity(uid, db, container) {
  if (!container) return;

  try {
    const txRef = collection(db, "customers", uid, "credit_transactions");
    const q = query(txRef, orderBy("createdAt", "desc"), limit(10));
    const snap = await getDocs(q);

    if (snap.empty) {
      container.innerHTML = `<div class="credits-empty-state"><p>No activity yet.</p></div>`;
      return;
    }

    const rows = snap.docs.map((d) => {
      const data = d.data();
      const isPositive = data.type !== "usage";
      const sign = isPositive ? "+" : "−";
      const colorClass = isPositive ? "credits-tx-positive" : "credits-tx-negative";
      return `
        <div class="credits-tx-row">
          <div class="credits-tx-info">
            <span class="credits-tx-desc">${data.description || (data.type === "purchase" ? "Credit purchase" : data.type === "bonus" ? "Bonus credits" : "Credits used")}</span>
            <span class="credits-tx-date">${formatDate(data.createdAt)}</span>
          </div>
          <span class="credits-tx-amount ${colorClass}">${sign}${data.amount}</span>
        </div>`;
    });

    container.innerHTML = rows.join("");
  } catch {
    container.innerHTML = `<div class="credits-empty-state"><p>No activity yet.</p></div>`;
  }
}

// ── Buy Credits dropdown ──────────────────────────────────────────────────────

let _dropdownOpen = false;

export function toggleCreditsDropdown() {
  const dropdown = document.getElementById("credits-buy-dropdown");
  if (!dropdown) return;
  _dropdownOpen = !_dropdownOpen;
  dropdown.classList.toggle("open", _dropdownOpen);
}

export function closeCreditsDropdown() {
  const dropdown = document.getElementById("credits-buy-dropdown");
  if (!dropdown) return;
  _dropdownOpen = false;
  dropdown.classList.remove("open");
}

// ── Checkout for credit packages ──────────────────────────────────────────────

export async function startCreditsCheckout(packageId) {
  const statusEl = document.getElementById("credits-status");
  const buyBtn = document.getElementById("credits-buy-btn");

  if (!state.currentUser) {
    setStatus(statusEl, "Sign in to purchase credits.", "error");
    return;
  }

  const pkg = BINAS_CONFIG?.creditPackages?.find((p) => p.id === packageId);
  if (!pkg) {
    setStatus(statusEl, "Unknown credit package.", "error");
    return;
  }

  if (pkg.priceId.startsWith("PLACEHOLDER")) {
    setStatus(statusEl, "This package is not available yet. Price ID coming soon.", "error");
    return;
  }

  closeCreditsDropdown();
  setLoadingState(buyBtn, true);
  setStatus(statusEl, "", "info");

  try {
    const { signInAnonymously } = await import("https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js");
    if (!state.auth.currentUser) {
      await signInAnonymously(state.auth);
    }

    const origin = window.location.origin;
    const sessionData = {
      mode: "payment",
      price: pkg.priceId,
      quantity: 1,
      success_url: `${origin}/app/settings?tab=credits&checkout=success`,
      cancel_url: `${origin}/app/settings?tab=credits&checkout=cancel`,
      metadata: {
        credit_package: pkg.id,
        credit_amount: String(pkg.amount),
        firebase_uid: state.auth.currentUser.uid,
      },
    };

    const sessionsRef = collection(state.firestore, "customers", state.auth.currentUser.uid, "checkout_sessions");
    const docRef = await addDoc(sessionsRef, sessionData);

    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      const data = snapshot.data();
      if (data?.url) {
        unsubscribe();
        window.addEventListener("pageshow", (e) => {
          if (e.persisted) setLoadingState(buyBtn, false);
        }, { once: true });
        window.location.href = data.url;
      }
      if (data?.error) {
        unsubscribe();
        setStatus(statusEl, data.error.message || "Checkout could not start.", "error");
        setLoadingState(buyBtn, false);
      }
    });
  } catch (error) {
    setStatus(statusEl, `Checkout error: ${error.message}`, "error");
    setLoadingState(buyBtn, false);
  }
}
