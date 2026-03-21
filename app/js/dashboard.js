import { state, BINAS_CONFIG } from "./state.js";
import { els } from "./elements.js";
import {
  formatDate,
  getProviderLabel,
  getProviderDescription,
  getAvatarMarkup,
} from "./utils.js";
import { renderBillingView } from "./billing.js";

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

  const labels = { billing: "Billing", settings: "Settings", ai: "AI Test" };
  const label = labels[viewName] || "Home";
  if (els.dashboardTopbarLabel) els.dashboardTopbarLabel.textContent = label;
  document.title = `FitFlow | ${label}`;

  if (viewName === "billing") renderBillingView();
  if (viewName === "settings") {
    updateSettingsPage();
    _showSettingsTabDirect(settingsTab || "profile");
  }
}
