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
      if (perEl) perEl.textContent = "/mo — jaarlijks gefactureerd";
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
    name: state.currentUser?.displayName || "Eigen account",
    email: state.currentUser?.email || "Niet ingelogd",
    role: getProviderLabel(state.currentUser),
    joined: joinedLabel,
    status: '<span class="badge badge-green">Active</span>',
  });

  rows.push({
    name: "Premium access",
    email: state.isPremiumUser ? "Toegang actief" : "Nog niet actief",
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
    email: state.dashboardContext?.userDoc?.plusLinkedAt || "Nog geen plusLink",
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
    els.settingsUserName.textContent = state.currentUser.displayName || state.currentUser.email || "Gast";
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
    "builder";
  const userName =
    state.currentUser?.displayName?.trim() || state.currentUser?.email || "Gast gebruiker";
  const userEmail = state.currentUser?.email || "Niet ingelogd";
  const avatarMarkup = getAvatarMarkup(state.currentUser);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Goedemorgen" : hour < 18 ? "Goedemiddag" : "Goedenavond";

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
      ? "Premium actief en gekoppeld"
      : "Premium niet actief";
  if (els.statProvider) els.statProvider.textContent = providerLabel;
  if (els.statProviderCopy)
    els.statProviderCopy.textContent = state.currentUser
      ? getProviderDescription(state.currentUser)
      : "Niet ingelogd";
  if (els.statCustomer)
    els.statCustomer.textContent = customerId === "—" ? "—" : customerId.slice(0, 8);
  if (els.statCustomerCopy)
    els.statCustomerCopy.textContent =
      customerId === "—" ? "Nog niet gesynchroniseerd" : "Stripe customer gekoppeld";
  if (els.statFirestore)
    els.statFirestore.textContent = state.currentUser ? "Synced" : "Ready";
  if (els.statFirestoreCopy)
    els.statFirestoreCopy.textContent = state.currentUser
      ? "Realtime accountstatus geladen"
      : "Log in voor accountdata";

  if (els.pricingPlan)
    els.pricingPlan.textContent = state.isPremiumUser ? "Premium actief" : "Free plan";
  if (els.pricingCopy) {
    els.pricingCopy.textContent = state.currentUser
      ? state.isPremiumUser
        ? "Je account en premium-status zijn gekoppeld aan Firebase en Stripe."
        : "Je bent ingelogd. Start checkout om premium aan je account te koppelen."
      : "Log in om je account en premium-status te synchroniseren.";
  }

  if (els.modalPlan) els.modalPlan.textContent = state.currentPlanLabel;
  if (els.modalPlanCopy) {
    els.modalPlanCopy.textContent = state.isPremiumUser
      ? "Premium is actief en zichtbaar in je dashboard."
      : state.currentUser
        ? "Start checkout om premium aan dit account te koppelen."
        : "Log in of gebruik Google om je account te openen.";
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

export function updateSessionInfo() {
  if (!state.currentUser || !els.sessionDevice) return;
  const ua = navigator.userAgent;
  let device = "Onbekend apparaat";
  if (/iPhone|iPad|iPod/.test(ua)) device = "iPhone / iPad";
  else if (/Android/.test(ua)) device = "Android apparaat";
  else if (/Mac/.test(ua)) device = "Mac";
  else if (/Windows/.test(ua)) device = "Windows";
  else if (/Linux/.test(ua)) device = "Linux";
  els.sessionDevice.textContent = device;
  const signInTime = state.currentUser.metadata?.lastSignInTime;
  if (els.sessionMeta) {
    els.sessionMeta.textContent = signInTime
      ? `Ingelogd op ${new Intl.DateTimeFormat("nl-NL", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(signInTime))}`
      : "Sessiedatum onbekend";
  }
}

export function updateSecurityTab() {
  if (!state.currentUser) return;
  const hasPassword = state.currentUser.providerData?.some((p) => p.providerId === "password");
  const hasGoogle = state.currentUser.providerData?.some((p) => p.providerId === "google.com");
  if (els.settingsPasswordDesc) {
    els.settingsPasswordDesc.textContent = hasPassword
      ? "Stuur een wachtwoord reset-e-mail om je wachtwoord te wijzigen."
      : "Je hebt nog geen wachtwoord ingesteld. Stuur een e-mail om er een te maken.";
  }
  if (els.settingsResetPasswordBtn) {
    els.settingsResetPasswordBtn.textContent = hasPassword
      ? "Wachtwoord wijzigen"
      : "Wachtwoord instellen";
  }
  if (els.settingsGoogleLinkBtn) {
    els.settingsGoogleLinkBtn.textContent = hasGoogle ? "Ontkoppelen" : "Verbinden";
    els.settingsGoogleLinkBtn.dataset.linked = hasGoogle ? "true" : "false";
  }
}

export function _showSettingsTabDirect(tabName) {
  document.querySelectorAll(".settings-tabs .settings-tab").forEach((t) =>
    t.classList.toggle("active", t.dataset.settingsTab === tabName)
  );
  document.querySelectorAll(".settings-view").forEach((v) =>
    v.classList.toggle("active", v.id === `settings-view-${tabName}`)
  );
  if (tabName === "sessions") updateSessionInfo();
  if (tabName === "security") updateSecurityTab();
}

export function showSettingsTab(tabName) {
  const url = `/dashboard/settings${tabName !== "profile" ? `?tab=${tabName}` : ""}`;
  window.history.replaceState({}, "", url);
  document.querySelectorAll("#sidebar-dash [data-dashboard-view='settings']").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.settingsTab === tabName);
  });
  _showSettingsTabDirect(tabName);
}

export function showDashboardView(viewName, settingsTab = null) {
  let path;
  if (viewName === "billing") path = "/dashboard/billing";
  else if (viewName === "settings")
    path = `/dashboard/settings${
      settingsTab && settingsTab !== "profile" ? `?tab=${settingsTab}` : ""
    }`;
  else path = "/dashboard";
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

  const labels = { billing: "Billing", settings: "Settings" };
  if (els.dashboardTopbarLabel)
    els.dashboardTopbarLabel.textContent = labels[viewName] || "Home";

  if (viewName === "billing") renderBillingView();
  if (viewName === "settings") {
    updateSettingsPage();
    _showSettingsTabDirect(settingsTab || "profile");
  }
}
