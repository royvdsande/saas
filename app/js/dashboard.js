import { state, BINAS_CONFIG } from "./state.js";
import { els } from "./elements.js";
import {
  formatDate,
  getProviderLabel,
  getProviderDescription,
  getAvatarMarkup,
} from "./utils.js";
import { renderBillingView } from "./billing.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

export function updatePricingCards() {
  const plans = BINAS_CONFIG?.plans || [];
  plans.forEach((plan) => {
    const priceEl = document.getElementById(`price-${plan.id}`);
    const perEl = document.getElementById(`per-${plan.id}`);
    if (state.currentBillingPeriod === "yearly") {
      if (priceEl) priceEl.textContent = `€ ${plan.yearlyPrice}`;
      if (perEl) perEl.textContent = "/mo — billed yearly";
    } else {
      if (priceEl) priceEl.textContent = `€ ${plan.monthlyPrice}`;
      if (perEl) perEl.textContent = "/mo";
    }
  });
}

export function updatePricingCopy() {
  state.currentBillingPeriod = "monthly";
  els.pricingToggleMonthly?.classList.add("active");
  els.pricingToggleYearly?.classList.remove("active");
  updatePricingCards();
}

export function updateAuthNavigation() {
  document.querySelectorAll(".nav-auth-logged-out").forEach((node) => {
    node.classList.toggle("hidden", Boolean(state.currentUser));
  });
  document.querySelectorAll(".nav-auth-logged-in").forEach((node) => {
    node.classList.toggle("hidden", !state.currentUser);
  });
}

export function buildTableRows() {
  const rows = [];
  const joinedLabel = formatDate(state.currentUser?.metadata?.creationTime);
  const customerId =
    state.dashboardContext?.customerDoc?.stripeCustomerId ||
    state.dashboardContext?.customerDoc?.stripeId ||
    "—";

  rows.push({
    name: state.currentUser?.displayName || "Your account",
    email: state.currentUser?.email || "Not signed in",
    role: getProviderLabel(state.currentUser),
    joined: joinedLabel,
    status: '<span class="badge badge-green">Active</span>',
  });

  rows.push({
    name: "Premium access",
    email: state.isPremiumUser ? "Access active" : "Not yet active",
    role: state.currentPlanLabel,
    joined: joinedLabel,
    status: state.isPremiumUser
      ? '<span class="badge badge-blue">Premium</span>'
      : '<span class="badge badge-gray">Free</span>',
  });

  rows.push({
    name: "Stripe customer",
    email: customerId,
    role: `${state.dashboardContext?.paymentsCount ?? 0} payments`,
    joined: formatDate(state.dashboardContext?.customerDoc?.updatedAt),
    status:
      customerId !== "—"
        ? '<span class="badge badge-green">Synced</span>'
        : '<span class="badge badge-yellow">Pending</span>',
  });

  rows.push({
    name: "Firestore user doc",
    email: state.dashboardContext?.userDoc?.plusLinkedAt || "No plus link yet",
    role: `${state.dashboardContext?.subscriptionsCount ?? 0} subscriptions`,
    joined: formatDate(state.dashboardContext?.customerDoc?.premium?.updatedAt),
    status: '<span class="badge badge-gray">Tracked</span>',
  });

  return rows
    .map(
      (row) => `
        <tr>
          <td data-label="Name">${row.name}</td>
          <td data-label="Email">${row.email}</td>
          <td data-label="Role">${row.role}</td>
          <td data-label="Joined">${row.joined}</td>
          <td data-label="Status">${row.status}</td>
        </tr>
      `
    )
    .join("");
}

export function updateSettingsPage() {
  if (!state.currentUser) return;
  const avatarMarkup = getAvatarMarkup(state.currentUser);
  if (els.settingsAvatar) els.settingsAvatar.innerHTML = avatarMarkup;
  if (els.settingsUserAvatar) els.settingsUserAvatar.innerHTML = avatarMarkup;
  if (els.settingsUserName)
    els.settingsUserName.textContent = state.currentUser.displayName || state.currentUser.email || "Guest";
  if (els.settingsUserEmail) els.settingsUserEmail.textContent = state.currentUser.email || "—";
  if (els.settingsNameInput && !els.settingsNameInput.matches(":focus")) {
    els.settingsNameInput.value = state.currentUser.displayName || "";
  }
  if (els.settingsCurrentEmail) els.settingsCurrentEmail.value = state.currentUser.email || "";
}

export function updateAccountSurfaces() {
  updateAuthNavigation();

  const firstName =
    state.currentUser?.displayName?.split(" ")[0] ||
    state.currentUser?.email?.split("@")[0] ||
    "there";
  const userName =
    state.currentUser?.displayName?.trim() || state.currentUser?.email || "Guest user";
  const userEmail = state.currentUser?.email || "Not signed in";
  const avatarMarkup = getAvatarMarkup(state.currentUser);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  if (els.dashboardGreeting) {
    els.dashboardGreeting.textContent = state.currentUser
      ? `${greeting}, ${firstName} 👋`
      : `${greeting} 👋`;
  }

  if (els.dashboardUserName) els.dashboardUserName.textContent = userName;
  if (els.dashboardUserEmail) els.dashboardUserEmail.textContent = userEmail;
  if (els.dashboardUserAvatar) els.dashboardUserAvatar.innerHTML = avatarMarkup;
  if (els.ctxUserName) els.ctxUserName.textContent = userName;
  if (els.ctxUserEmail) els.ctxUserEmail.textContent = userEmail;

  if (els.modalUserName) els.modalUserName.textContent = userName;
  if (els.modalUserEmail) els.modalUserEmail.textContent = userEmail;
  if (els.modalAvatar) els.modalAvatar.innerHTML = avatarMarkup;

  const customerId =
    state.dashboardContext?.customerDoc?.stripeCustomerId ||
    state.dashboardContext?.customerDoc?.stripeId ||
    "—";
  const providerLabel = getProviderLabel(state.currentUser);

  if (els.statPlan) els.statPlan.textContent = state.currentPlanLabel;
  if (els.statPlanCopy)
    els.statPlanCopy.textContent = state.isPremiumUser
      ? "Premium active and linked"
      : "Premium not active";
  if (els.statProvider) els.statProvider.textContent = providerLabel;
  if (els.statProviderCopy)
    els.statProviderCopy.textContent = state.currentUser
      ? getProviderDescription(state.currentUser)
      : "Not signed in";
  if (els.statCustomer)
    els.statCustomer.textContent = customerId === "—" ? "—" : customerId.slice(0, 8);
  if (els.statCustomerCopy)
    els.statCustomerCopy.textContent =
      customerId === "—" ? "Not yet synced" : "Stripe customer linked";
  if (els.statFirestore)
    els.statFirestore.textContent = state.currentUser ? "Synced" : "Ready";
  if (els.statFirestoreCopy)
    els.statFirestoreCopy.textContent = state.currentUser
      ? "Realtime account status loaded"
      : "Sign in for account data";

  if (els.pricingPlan)
    els.pricingPlan.textContent = state.isPremiumUser ? "Premium active" : "Free plan";
  if (els.pricingCopy) {
    els.pricingCopy.textContent = state.currentUser
      ? state.isPremiumUser
        ? "Your account and premium status are linked to Firebase and Stripe."
        : "You're signed in. Start checkout to link premium to your account."
      : "Sign in to sync your account and premium status.";
  }

  if (els.modalPlan) els.modalPlan.textContent = state.currentPlanLabel;
  if (els.modalPlanCopy) {
    els.modalPlanCopy.textContent = state.isPremiumUser
      ? "Premium is active and visible in your dashboard."
      : state.currentUser
        ? "Start checkout to link premium to this account."
        : "Sign in or use Google to access your account.";
  }

  if (els.tableBody) {
    els.tableBody.innerHTML = state.currentUser ? buildTableRows() : "";
  }

  const ctaText = state.isPremiumUser ? "Premium active" : "Upgrade to Pro";
  if (els.dashboardCheckoutCta) els.dashboardCheckoutCta.textContent = ctaText;
  if (els.modalCheckoutBtn)
    els.modalCheckoutBtn.textContent = state.isPremiumUser ? "Premium active" : "Start checkout";

  updateSettingsPage();
}

export function updateSecurityTab() {
  if (!state.currentUser) return;
  const hasPassword = state.currentUser.providerData?.some((p) => p.providerId === "password");

  const updateCard = document.getElementById("settings-password-update-card");
  const setCard = document.getElementById("settings-password-set-card");
  if (updateCard) updateCard.classList.toggle("hidden", !hasPassword);
  if (setCard) setCard.classList.toggle("hidden", hasPassword);
}

export function _showSettingsTabDirect(tabName) {
  document.querySelectorAll(".settings-tabs .settings-tab").forEach((t) =>
    t.classList.toggle("active", t.dataset.settingsTab === tabName)
  );
  document.querySelectorAll(".settings-view").forEach((v) =>
    v.classList.toggle("active", v.id === `settings-view-${tabName}`)
  );
  if (tabName === "security") updateSecurityTab();
  const tabLabels = { profile: "Profile", security: "Security" };
  document.title = `FitFlow | ${tabLabels[tabName] || "Settings"}`;
}

export function showSettingsTab(tabName) {
  const url = `/app/settings${tabName !== "profile" ? `?tab=${tabName}` : ""}`;
  window.history.replaceState({}, "", url);
  document.querySelectorAll("#sidebar-dash [data-dashboard-view='settings']").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.settingsTab === tabName);
  });
  _showSettingsTabDirect(tabName);
}

export function showDashboardView(viewName, settingsTab = null) {
  let path;
  if (viewName === "billing") path = "/app/billing";
  else if (viewName === "ai") path = "/app/ai";
  else if (viewName === "settings")
    path = `/app/settings${
      settingsTab && settingsTab !== "profile" ? `?tab=${settingsTab}` : ""
    }`;
  else path = "/app/";
  window.history.replaceState({}, "", path);

  els.dashViews.forEach((v) => v.classList.toggle("active", v.id === `dash-view-${viewName}`));

  document.querySelectorAll("#sidebar-dash [data-dashboard-view]").forEach((btn) => {
    if (viewName === "settings" && btn.dataset.dashboardView === "settings") {
      btn.classList.toggle("active", btn.dataset.settingsTab === (settingsTab || "profile"));
    } else {
      btn.classList.toggle(
        "active",
        btn.dataset.dashboardView === viewName && btn.dataset.dashboardView !== "settings"
      );
    }
  });

  const labels = { billing: "Billing", settings: "Settings", ai: "AI Test", plan: "My Plan" };
  const label = labels[viewName] || "Home";
  if (els.dashboardTopbarLabel) els.dashboardTopbarLabel.textContent = label;
  document.title = `FitFlow | ${label}`;

  if (viewName === "plan") loadPlanView();
  if (viewName === "billing") renderBillingView();
  if (viewName === "settings") {
    updateSettingsPage();
    _showSettingsTabDirect(settingsTab || "profile");
  }
}

// --- My Plan view ---
async function loadPlanView() {
  const container = document.getElementById("plan-content");
  if (!container || !state.currentUser || !state.firestore) return;

  container.innerHTML = `<div style="text-align:center;padding:48px 20px;color:var(--gray-400)"><p style="font-size:14px">Loading your plan...</p></div>`;

  try {
    const userDoc = await getDoc(doc(state.firestore, "users", state.currentUser.uid));
    const data = userDoc.exists() ? userDoc.data() : null;
    const plan = data?.plan;

    if (!plan) {
      container.innerHTML = `
        <div style="text-align:center;padding:60px 20px">
          <div style="width:56px;height:56px;background:var(--accent-50,#ecfdf5);border-radius:14px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent,#10b981)" stroke-width="1.5"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
          <h3 style="font-size:18px;font-weight:700;margin-bottom:6px">No plan yet</h3>
          <p style="font-size:14px;color:var(--gray-500);margin-bottom:20px;max-width:340px;margin-left:auto;margin-right:auto">Complete the onboarding to get your personalized AI training and nutrition plan.</p>
          <a class="btn btn-primary" href="/onboarding">Create my plan &rarr;</a>
        </div>`;
      return;
    }

    const isPremium = state.isPremiumUser;
    let html = "";

    // Summary + stats
    if (plan.summary) {
      html += `<div class="sc-card" style="margin-bottom:16px"><div class="sc-card-body"><p style="font-size:15px;line-height:1.6">${plan.summary}</p>
        <div style="display:flex;gap:16px;margin-top:12px;flex-wrap:wrap">
          <span style="font-size:13px;color:var(--gray-500)"><strong style="color:var(--accent,#10b981)">${plan.dailyCalories || "—"}</strong> daily kcal</span>
          <span style="font-size:13px;color:var(--gray-500)"><strong style="color:var(--accent,#10b981)">7</strong> days planned</span>
        </div>
      </div></div>`;
    }

    // Tips
    if (plan.tips?.length) {
      html += `<div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">${plan.tips.map((t) => `<div style="flex:1;min-width:140px;background:var(--accent-50,#ecfdf5);border:1px solid var(--accent-light,#d1fae5);border-radius:var(--radius,10px);padding:10px 12px;font-size:13px;color:var(--accent-dark,#059669);line-height:1.5">${t}</div>`).join("")}</div>`;
    }

    // Training
    html += `<div class="sc-card" style="margin-bottom:16px"><div class="sc-card-header"><h3>Training Plan</h3></div><div class="sc-card-body" style="padding:0">`;
    (plan.training || []).forEach((day, i) => {
      const blurred = !isPremium && i >= 2;
      html += `<div style="border-bottom:1px solid var(--gray-100);${blurred ? "filter:blur(6px);user-select:none;pointer-events:none" : ""}">
        <div style="padding:12px 16px;font-size:13px;font-weight:700;background:var(--gray-50);border-bottom:1px solid var(--gray-100)">${day.day}</div>
        <div style="padding:8px 16px">${(day.exercises || []).map((ex) => `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--gray-50)"><span style="font-size:14px;font-weight:500">${ex.name}</span><span style="font-size:13px;color:var(--gray-500)">${ex.sets} &times; ${ex.reps} &bull; ${ex.rest}</span></div>`).join("")}</div>
      </div>`;
    });
    html += `</div></div>`;

    // Nutrition
    html += `<div class="sc-card" style="margin-bottom:16px"><div class="sc-card-header"><h3>Nutrition Plan</h3></div><div class="sc-card-body" style="padding:0">`;
    (plan.nutrition || []).forEach((day, i) => {
      const blurred = !isPremium && i >= 1;
      const meals = day.meals || {};
      html += `<div style="border-bottom:1px solid var(--gray-100);${blurred ? "filter:blur(6px);user-select:none;pointer-events:none" : ""}">
        <div style="padding:12px 16px;font-size:13px;font-weight:700;background:var(--gray-50);border-bottom:1px solid var(--gray-100);display:flex;justify-content:space-between"><span>${day.day}</span><span style="font-weight:500;color:var(--gray-500)">${day.kcal || "—"} kcal</span></div>
        <div style="padding:8px 16px">${["breakfast", "lunch", "dinner", "snacks"].filter((k) => meals[k]).map((k) => `<div style="padding:4px 0;border-bottom:1px solid var(--gray-50)"><span style="font-size:11px;font-weight:600;text-transform:uppercase;color:var(--gray-400)">${k}</span><p style="font-size:14px;margin-top:2px">${meals[k]}</p></div>`).join("")}</div>
      </div>`;
    });
    html += `</div></div>`;

    // Paywall for non-premium
    if (!isPremium) {
      html += `<div style="text-align:center;padding:32px 24px;background:linear-gradient(135deg,var(--accent-50,#ecfdf5),#f0fdf4);border:1px solid var(--accent-light,#d1fae5);border-radius:var(--radius-lg,14px);margin-top:-60px;position:relative">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent,#10b981)" stroke-width="1.5" style="margin-bottom:8px"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        <h3 style="font-size:18px;font-weight:800;margin-bottom:6px">Unlock your complete plan</h3>
        <p style="font-size:14px;color:var(--gray-500);margin-bottom:16px;max-width:360px;margin-left:auto;margin-right:auto">Upgrade to see all 7 days of training and nutrition, plus weekly updates.</p>
        <button class="btn btn-primary" id="plan-unlock-btn" style="background:var(--accent,#10b981);border-color:var(--accent,#10b981)">Upgrade now &rarr;</button>
      </div>`;
    }

    container.innerHTML = html;

    // Bind unlock button
    document.getElementById("plan-unlock-btn")?.addEventListener("click", () => {
      import("./billing.js").then(({ startCheckout }) => {
        const priceId = BINAS_CONFIG?.plans?.[1]?.monthlyPriceId || BINAS_CONFIG?.stripePriceId;
        startCheckout(priceId);
      });
    });
  } catch {
    container.innerHTML = `<div style="text-align:center;padding:48px 20px;color:var(--gray-500)"><p>Could not load your plan. Please try again later.</p></div>`;
  }
}
