import {
  collection,
  addDoc,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { state, BINAS_CONFIG } from "./state.js";
import { els } from "./elements.js";
import { setStatus, setLoadingState } from "./utils.js";
import { initFirebase } from "./state.js";

export async function startCheckout(statusTarget = els.pricingStatus, planId = null, triggerButton = null) {
  if (state.isPremiumUser) {
    setStatus(statusTarget, "Premium is already active on this account.", "success");
    return;
  }

  initFirebase();

  const checkoutButtons = [
    triggerButton,
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
      trial_period_days: 14,
      success_url: wasLoggedIn || window.location.pathname.startsWith("/app") || window.location.pathname.startsWith("/onboarding")
        ? `${window.location.origin}/app/?checkout=success`
        : `${window.location.origin}/pricing.html?checkout=success&anonymous=true`,
      cancel_url: window.location.pathname.startsWith("/app")
        ? `${window.location.origin}/app/?checkout=cancel`
        : `${window.location.origin}/pricing.html?checkout=cancel`,
      allow_promotion_codes: true,
    };

    if (state.auth.currentUser?.email) {
      sessionData.customer_email = state.auth.currentUser.email;
    }

    const sessionsRef = collection(state.firestore, "customers", state.auth.currentUser.uid, "checkout_sessions");
    const docRef = await addDoc(sessionsRef, sessionData);

    onSnapshot(docRef, (snapshot) => {
      const data = snapshot.data();
      if (data?.url) {
        window.addEventListener("pageshow", (e) => {
          if (e.persisted) checkoutButtons.forEach((button) => setLoadingState(button, false));
        }, { once: true });
        window.location.href = data.url;
      }
      if (data?.error) {
        setStatus(statusTarget, data.error.message || "Checkout could not start.", "error");
        checkoutButtons.forEach((button) => setLoadingState(button, false));
      }
    });
  } catch (error) {
    setStatus(statusTarget, `Checkout error: ${error.message}`, "error");
    checkoutButtons.forEach((button) => setLoadingState(button, false));
  }
}

export async function openBillingPortal(statusEl, flow = null) {
  if (!state.currentUser) {
    setStatus(statusEl, "Sign in to open the billing portal.", "error");
    return;
  }
  const portalBtns = document.querySelectorAll("[data-portal-flow]");
  portalBtns.forEach((b) => setLoadingState(b, true));
  setStatus(statusEl, "", "info");
  try {
    const token = await state.currentUser.getIdToken();
    const body = flow ? { flow } : {};
    const res = await fetch("/api/create-portal-session", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Portal not available.");
    window.location.href = data.url;
  } catch (error) {
    setStatus(statusEl, error.message, "error");
    portalBtns.forEach((b) => setLoadingState(b, false));
  }
}

export function renderBillingView() {
  const currentPriceId = state.dashboardContext?.currentPriceId || null;
  const plans = BINAS_CONFIG?.plans || [];
  const currentPlan = plans.find(
    (p) => p.monthlyPriceId === currentPriceId || p.yearlyPriceId === currentPriceId
  );

  // Update header plan info
  if (els.billingPlanName) els.billingPlanName.textContent = currentPlan ? currentPlan.name : "Free";
  if (els.billingPlanSub) {
    els.billingPlanSub.textContent = currentPlan
      ? `Your ${currentPlan.name} plan is active.`
      : "No active subscription.";
  }
  if (els.billingPlanBadge) {
    els.billingPlanBadge.textContent = currentPlan ? currentPlan.name : "Free";
    els.billingPlanBadge.className = currentPlan ? "badge badge-blue" : "badge badge-gray";
  }

  // Update each plan card CTA
  plans.forEach((plan) => {
    const card = document.getElementById(`billing-card-${plan.id}`);
    const btn = document.getElementById(`billing-cta-${plan.id}`);
    if (!card || !btn) return;

    const isCurrent = currentPlan?.id === plan.id;
    card.classList.toggle("billing-upgrade-card--current", isCurrent);

    if (isCurrent) {
      btn.textContent = "Current plan";
      btn.disabled = true;
    } else if (!currentPlan) {
      btn.textContent = "Get started";
      btn.disabled = false;
    } else {
      // Determine upgrade or downgrade by plan index
      const currentIdx = plans.findIndex((p) => p.id === currentPlan.id);
      const planIdx = plans.findIndex((p) => p.id === plan.id);
      btn.textContent = planIdx > currentIdx ? "Upgrade" : "Downgrade";
      btn.disabled = false;
    }
  });

  // Show manage card only when subscribed
  const manageCard = document.getElementById("billing-manage-card");
  if (manageCard) manageCard.classList.toggle("hidden", !currentPlan);
}
