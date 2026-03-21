import {
  collection,
  addDoc,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { state, BINAS_CONFIG } from "./state.js";
import { els } from "./elements.js";
import { setStatus, setLoadingState } from "./utils.js";
import { initFirebase } from "./state.js";

export async function startCheckout(statusTarget = els.pricingStatus, planId = null) {
  if (state.isPremiumUser) {
    setStatus(statusTarget, "Premium is al actief op dit account.", "success");
    return;
  }

  initFirebase();

  const checkoutButtons = [
    els.pricingCheckoutBtn,
    els.dashboardCheckoutCta,
    els.dashboardSidebarCheckout,
    els.modalCheckoutBtn,
  ].filter(Boolean);
  checkoutButtons.forEach((button) => setLoadingState(button, true));
  setStatus(statusTarget, "", "info");

  let priceId = BINAS_CONFIG?.stripePriceId || "price_1TDM6gLzjWXxGtsSmBBGHvnY";
  if (planId && BINAS_CONFIG?.plans) {
    const plan = BINAS_CONFIG.plans.find((p) => p.id === planId);
    if (plan) {
      priceId = state.currentBillingPeriod === "yearly" ? plan.yearlyPriceId : plan.monthlyPriceId;
    }
  }

  try {
    const { signInAnonymously } = await import("https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js");
    const wasLoggedIn = state.auth.currentUser && !state.auth.currentUser.isAnonymous;

    if (!state.auth.currentUser) {
      await signInAnonymously(state.auth);
    }

    const sessionData = {
      mode: "subscription",
      price: priceId,
      success_url: wasLoggedIn || window.location.pathname.startsWith("/app")
        ? `${window.location.origin}/app/?checkout=success`
        : `${window.location.origin}/pricing.html?checkout=success&anonymous=true`,
      cancel_url: window.location.pathname.startsWith("/app")
        ? `${window.location.origin}/app/?checkout=cancel`
        : `${window.location.origin}/pricing.html?checkout=cancel`,
    };

    if (state.auth.currentUser?.email) {
      sessionData.customer_email = state.auth.currentUser.email;
    }

    const sessionsRef = collection(state.firestore, "customers", state.auth.currentUser.uid, "checkout_sessions");
    const docRef = await addDoc(sessionsRef, sessionData);

    onSnapshot(docRef, (snapshot) => {
      const data = snapshot.data();
      if (data?.url) {
        window.location.href = data.url;
      }
      if (data?.error) {
        setStatus(statusTarget, data.error.message || "Checkout kon niet starten.", "error");
      }
    });
  } catch (error) {
    setStatus(statusTarget, `Fout bij checkout: ${error.message}`, "error");
  } finally {
    checkoutButtons.forEach((button) => setLoadingState(button, false));
  }
}

export async function openBillingPortal(statusEl) {
  if (!state.currentUser) {
    setStatus(statusEl, "Log in om het billing portaal te openen.", "error");
    return;
  }
  setLoadingState(els.billingPortalBtn, true);
  setStatus(statusEl, "", "info");
  try {
    const token = await state.currentUser.getIdToken();
    const res = await fetch("/api/create-portal-session", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Portaal niet beschikbaar.");
    window.location.href = data.url;
  } catch (error) {
    setStatus(statusEl, error.message, "error");
    setLoadingState(els.billingPortalBtn, false);
  }
}

export function renderBillingView() {
  if (els.billingPlanName) els.billingPlanName.textContent = state.isPremiumUser ? "Pro" : "Free";
  if (els.billingPlanSub) {
    els.billingPlanSub.textContent = state.isPremiumUser
      ? "Je premium plan is actief."
      : "Upgrade om meer functies te ontgrendelen.";
  }
  if (els.billingPlanBadge) {
    els.billingPlanBadge.textContent = state.isPremiumUser ? "Pro" : "Free";
    els.billingPlanBadge.className = state.isPremiumUser ? "badge badge-blue" : "badge badge-gray";
  }
  if (els.billingUpgradeGrid) els.billingUpgradeGrid.classList.toggle("hidden", state.isPremiumUser);
  if (els.billingPortalWrap) els.billingPortalWrap.classList.toggle("hidden", !state.isPremiumUser);
}
