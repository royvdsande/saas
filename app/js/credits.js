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

function fmtCredits(n) {
  return n.toLocaleString("nl-NL");
}

export function openCreditsModal() {
  const modal = document.getElementById("credits-modal");
  if (!modal) return;
  // Render packages from config
  const packages = BINAS_CONFIG?.creditPackages || [];
  const pkgContainer = document.getElementById("credits-modal-packages");
  if (pkgContainer) {
    try {
      pkgContainer.innerHTML = packages.map((pkg) => {
        const total = pkg.credits + (pkg.bonus || 0);
        const popularMarkup = pkg.popular
          ? `<span class="credits-pkg-popular-badge">Popular</span>`
          : "";
        const bonusMarkup = pkg.bonus
          ? `<span class="credits-pkg-bonus">(+${fmtCredits(pkg.bonus)} bonus)</span>`
          : "";
        return `
          <div class="credits-pkg-row${pkg.popular ? " credits-pkg-row--popular" : ""}">
            ${popularMarkup}
            <div class="credits-pkg-info">
              <p class="credits-pkg-name">${pkg.label}</p>
              <p class="credits-pkg-desc">${pkg.desc}</p>
              <div class="credits-pkg-amount-row">
                <span class="credits-pkg-amount">${fmtCredits(total)} credits</span>
                ${bonusMarkup}
              </div>
            </div>
            <div class="credits-pkg-right">
              <span class="credits-pkg-price">€ ${pkg.price}</span>
              <button class="btn btn-primary" style="white-space:nowrap" data-credits-package="${pkg.id}">Buy Now</button>
            </div>
          </div>`;
      }).join("");
    } catch (e) {
      console.error("Credits modal render error:", e);
    }
  }
  modal.classList.remove("hidden");
  modal.style.display = "flex"; // belt-and-suspenders: ensure flex display regardless of cascade
}

export function closeCreditsModal() {
  const modal = document.getElementById("credits-modal");
  if (!modal) return;
  modal.classList.add("hidden");
  modal.style.display = ""; // reset inline style so hidden class works next time
}

function formatDate(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}

function renderTransactions(txSnap) {
  if (!els.creditsTransactions) return;
  if (txSnap.empty) {
    els.creditsTransactions.innerHTML =
      '<p style="text-align:center;color:var(--gray-400);padding:20px 0;font-size:14px">No activity yet.</p>';
    return;
  }
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
        <span class="credits-tx-amount ${amountClass}">${sign}${fmtCredits(tx.amount)}</span>
      </div>`;
    })
    .join("");
}

function updateBalanceDisplay(statEls, credits) {
  const purchased = credits.purchased || 0;
  const bonus = credits.bonus || 0;
  const used = credits.used || 0;
  const available = Math.max(0, purchased + bonus - used);
  statEls.forEach((el) => el?.classList.remove("skeleton"));
  if (els.creditsAvailable) els.creditsAvailable.textContent = fmtCredits(available);
  if (els.creditsPurchased) els.creditsPurchased.textContent = fmtCredits(purchased);
  if (els.creditsBonus) els.creditsBonus.textContent = fmtCredits(bonus);
  if (els.creditsUsed) els.creditsUsed.textContent = fmtCredits(used);
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

  // Show subscription monthly credit allowance info if user has active plan
  const infoEl = document.getElementById("credits-subscription-info");
  const subAmountEl = document.getElementById("credits-sub-amount");
  if (state.isPremiumUser && state.dashboardContext?.currentPriceId && infoEl && subAmountEl) {
    const priceId = state.dashboardContext.currentPriceId;
    const plan = (BINAS_CONFIG.plans || []).find(
      (p) => p.monthlyPriceId === priceId || p.yearlyPriceId === priceId
    );
    if (plan?.monthlyCredits) {
      subAmountEl.textContent = fmtCredits(plan.monthlyCredits);
      infoEl.style.display = "block";
    }
  }

  try {
    const customerRef = doc(state.firestore, "customers", state.currentUser.uid);

    // Auto-grant subscription credits if eligible (runs silently, does not block UI)
    if (state.isPremiumUser) {
      try {
        const token = await state.currentUser.getIdToken();
        const grantRes = await fetch("/api/grant-subscription-credits", {
          headers: { Authorization: `Bearer ${token}` },
        });
        // If credits were just granted, re-fetch balance after commit (handled below)
        if (grantRes.ok) {
          const grantData = await grantRes.json();
          if (grantData.granted) {
            // Small delay to allow Firestore write to propagate
            await new Promise((r) => setTimeout(r, 600));
          }
        }
      } catch {
        // Silent — subscription grant failure should never block the credits view
      }
    }

    // Fetch credit balance from customers/{uid}
    const customerSnap = await getDoc(customerRef);
    const credits = customerSnap.exists() ? (customerSnap.data().credits || {}) : {};
    updateBalanceDisplay(statEls, credits);

    // Fetch transaction history
    const txRef = collection(state.firestore, "customers", state.currentUser.uid, "credit_transactions");
    const txQuery = query(txRef, orderBy("createdAt", "desc"), limit(20));
    const txSnap = await getDocs(txQuery);
    renderTransactions(txSnap);
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
