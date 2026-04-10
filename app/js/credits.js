import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { state, BINAS_CONFIG } from "./state.js";
import { els } from "./elements.js";
import { setStatus, setLoadingState } from "./utils.js";

function formatDate(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}

export async function renderCreditsView() {
  if (!state.currentUser || !state.firestore) return;

  // Show skeleton loading state
  const statEls = [els.creditsAvailable, els.creditsPurchased, els.creditsBonus, els.creditsUsed];
  statEls.forEach((el) => { if (el) { el.textContent = "0"; el.classList.add("skeleton"); } });
  if (els.creditsTransactions) {
    els.creditsTransactions.innerHTML = [1, 2, 3].map(() => `
      <div class="credits-tx-row">
        <div style="flex:1">
          <div class="skeleton" style="height:14px;width:180px;border-radius:4px;margin-bottom:6px"></div>
          <div class="skeleton" style="height:11px;width:80px;border-radius:4px"></div>
        </div>
        <div class="skeleton" style="height:16px;width:36px;border-radius:4px"></div>
      </div>`).join("");
  }

  try {
    // Fetch credit balance from customers/{uid}
    const customerRef = doc(state.firestore, "customers", state.currentUser.uid);
    const customerSnap = await getDoc(customerRef);
    const credits = customerSnap.exists() ? (customerSnap.data().credits || {}) : {};

    const purchased = credits.purchased || 0;
    const bonus = credits.bonus || 0;
    const used = credits.used || 0;
    const available = Math.max(0, purchased + bonus - used);

    statEls.forEach((el) => el?.classList.remove("skeleton"));
    if (els.creditsAvailable) els.creditsAvailable.textContent = available;
    if (els.creditsPurchased) els.creditsPurchased.textContent = purchased;
    if (els.creditsBonus) els.creditsBonus.textContent = bonus;
    if (els.creditsUsed) els.creditsUsed.textContent = used;

    // Fetch transaction history
    const txRef = collection(state.firestore, "customers", state.currentUser.uid, "credit_transactions");
    const txQuery = query(txRef, orderBy("createdAt", "desc"), limit(20));
    const txSnap = await getDocs(txQuery);

    if (els.creditsTransactions) {
      if (txSnap.empty) {
        els.creditsTransactions.innerHTML =
          '<p style="text-align:center;color:var(--gray-400);padding:20px 0;font-size:14px">No activity yet.</p>';
      } else {
        els.creditsTransactions.innerHTML = txSnap.docs
          .map((d) => {
            const tx = d.data();
            const isPositive = tx.type !== "used";
            const sign = isPositive ? "+" : "-";
            const amountClass = isPositive ? "positive" : "negative";
            return `<div class="credits-tx-row">
              <div>
                <div class="credits-tx-desc">${tx.description || (tx.type === "purchase" ? "Credit purchase" : tx.type)}</div>
                <div class="credits-tx-date">${formatDate(tx.createdAt)}</div>
              </div>
              <span class="credits-tx-amount ${amountClass}">${sign}${tx.amount}</span>
            </div>`;
          })
          .join("");
      }
    }
  } catch (err) {
    statEls.forEach((el) => { if (el) { el.classList.remove("skeleton"); el.textContent = "0"; } });
    if (els.creditsTransactions) {
      els.creditsTransactions.innerHTML =
        '<p style="text-align:center;color:var(--gray-400);padding:20px 0;font-size:14px">No activity yet.</p>';
    }
  }
}

export async function buyCredits(packageId, statusEl) {
  if (!state.currentUser) {
    setStatus(statusEl, "Sign in to buy credits.", "error");
    return;
  }

  const pkg = BINAS_CONFIG?.creditPackages?.find((p) => p.id === packageId);
  if (!pkg) {
    setStatus(statusEl, "Invalid credit package.", "error");
    return;
  }

  const btn = els.creditsBuyBtn;
  if (btn) setLoadingState(btn, true);
  setStatus(statusEl, "", "info");

  try {
    const token = await state.currentUser.getIdToken();
    const res = await fetch("/api/buy-credits", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ packageId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Could not start checkout.");
    window.location.href = data.url;
  } catch (err) {
    setStatus(statusEl, err.message, "error");
    if (btn) setLoadingState(btn, false);
  }
}

export async function claimCredits(sessionId, statusEl) {
  if (!state.currentUser || !sessionId) return;

  setStatus(statusEl, "Verifying your purchase...", "info");

  try {
    const token = await state.currentUser.getIdToken();
    const res = await fetch(`/api/claim-credits?session_id=${encodeURIComponent(sessionId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();

    // Clean the URL so a page refresh doesn't re-trigger the claim
    const cleanUrl = "/app/settings?tab=credits";
    window.history.replaceState({}, "", cleanUrl);

    if (!res.ok) throw new Error(data.message || "Could not claim credits.");

    if (data.already_claimed) {
      setStatus(statusEl, "Credits already added to your balance.", "success");
    } else {
      setStatus(statusEl, `${data.credits} credits added to your balance!`, "success");
    }

    // Refresh the credits display
    await renderCreditsView();
  } catch (err) {
    window.history.replaceState({}, "", "/app/settings?tab=credits");
    setStatus(statusEl, err.message, "error");
  }
}
