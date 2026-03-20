import {
  initializeApp,
  getApps,
  getApp,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-analytics.js";
import {
  getAuth,
  isSignInWithEmailLink,
  onAuthStateChanged,
  signOut,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import {
  getFirestore,
  addDoc,
  collection,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  query,
  where,
  getDocs,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import BINAS_CONFIG_DEFAULT from "./config.js";

const LOCAL_CONFIG_KEY = "binas:admin-config-override";
let BINAS_CONFIG = { ...BINAS_CONFIG_DEFAULT };
try {
  const localOverride = localStorage.getItem(LOCAL_CONFIG_KEY);
  if (localOverride) {
    BINAS_CONFIG = { ...BINAS_CONFIG, ...JSON.parse(localOverride) };
  }
} catch (error) {
  console.warn("Could not load local config override:", error);
}

const plusLocalKey = "binas:plus-local-status";
const storedEmailKey = "binas:premium-email";
const pendingNameKey = "fitflow:pending-name";

let firebaseApp;
let auth;
let firestore;
let currentUser = null;
let isPremiumUser = false;
let currentPlanLabel = "Free";
let dashboardContext = null;
let currentPageId = "page-landing";

const firebaseAuthDomain = BINAS_CONFIG?.authDomain || "account.binas.app";
const firebaseConfig = {
  apiKey: "AIzaSyBgXo3zllXtFJZDn4elpY8DemEQG_ltMk0",
  authDomain: firebaseAuthDomain,
  projectId: "binas-91a32",
  storageBucket: "binas-91a32.firebasestorage.app",
  messagingSenderId: "971498903694",
  appId: "1:971498903694:web:5ab8b630b183f5204ed1df",
  measurementId: "G-1LLBGZNRNC",
};

const els = {
  pages: document.querySelectorAll(".page"),
  routeButtons: document.querySelectorAll("[data-route]"),
  footerRoutes: document.querySelectorAll(".footer-route"),
  mobileMenuLinks: document.querySelectorAll(".mobile-menu-link[data-route]"),
  burgerButtons: document.querySelectorAll(".nav-burger"),
  faqButtons: document.querySelectorAll(".faq-q"),
  signinForm: document.getElementById("signin-form"),
  signupForm: document.getElementById("signup-form"),
  signinEmail: document.getElementById("signin-email"),
  signupEmail: document.getElementById("signup-email"),
  signupName: document.getElementById("signup-name"),
  signinSubmit: document.getElementById("signin-submit"),
  signupSubmit: document.getElementById("signup-submit"),
  signinGoogle: document.getElementById("signin-google"),
  signupGoogle: document.getElementById("signup-google"),
  signinStatus: document.getElementById("signin-status"),
  signupStatus: document.getElementById("signup-status"),
  pricingStatus: document.getElementById("pricing-status"),
  dashboardStatus: document.getElementById("dashboard-status"),
  pricingCheckoutBtn: document.getElementById("pricing-checkout-btn"),
  dashboardCheckoutCta: document.getElementById("dashboard-checkout-cta"),
  dashboardSidebarCheckout: document.getElementById("dashboard-sidebar-checkout"),
  modalCheckoutBtn: document.getElementById("modal-checkout-btn"),
  modalDashboardBtn: document.getElementById("modal-dashboard-btn"),
  modalLogoutBtn: document.getElementById("modal-logout-btn"),
  navOpenAccount: document.getElementById("nav-open-account"),
  mobileOpenAccount: document.getElementById("mobile-open-account"),
  pricingAccountButtons: document.querySelectorAll(".pricing-account-btn"),
  dashboardOpenSidebar: document.getElementById("dashboard-open-sidebar"),
  sidebarDash: document.getElementById("sidebar-dash"),
  overlayDash: document.getElementById("overlay-dash"),
  dashboardUserTrigger: document.getElementById("dashboard-user-trigger"),
  dashboardAccountMenu: document.getElementById("dashboard-account-menu"),
  dashboardSignout: document.getElementById("dashboard-signout"),
  ctxOpenBilling: document.getElementById("ctx-open-billing"),
  ctxOpenPricing: document.getElementById("ctx-open-pricing"),
  accountModalShell: document.getElementById("account-modal-shell"),
  accountModalBackdrop: document.getElementById("account-modal-backdrop"),
  accountModalClose: document.getElementById("account-modal-close"),
  modalStatus: document.getElementById("modal-status"),
  modalUserName: document.getElementById("modal-user-name"),
  modalUserEmail: document.getElementById("modal-user-email"),
  modalAvatar: document.getElementById("modal-avatar"),
  modalPlan: document.getElementById("modal-plan"),
  modalPlanCopy: document.getElementById("modal-plan-copy"),
  pricingPlan: document.getElementById("pricing-account-plan"),
  pricingCopy: document.getElementById("pricing-account-copy"),
  dashboardGreeting: document.getElementById("dashboard-greeting"),
  dashboardUserName: document.getElementById("dashboard-user-name"),
  dashboardUserEmail: document.getElementById("dashboard-user-email"),
  dashboardUserAvatar: document.getElementById("dashboard-user-avatar"),
  ctxUserName: document.getElementById("ctx-user-name"),
  ctxUserEmail: document.getElementById("ctx-user-email"),
  tableBody: document.getElementById("dashboard-table-body"),
  statPlan: document.getElementById("stat-plan"),
  statPlanCopy: document.getElementById("stat-plan-copy"),
  statProvider: document.getElementById("stat-provider"),
  statProviderCopy: document.getElementById("stat-provider-copy"),
  statCustomer: document.getElementById("stat-customer"),
  statCustomerCopy: document.getElementById("stat-customer-copy"),
  statFirestore: document.getElementById("stat-firestore"),
  statFirestoreCopy: document.getElementById("stat-firestore-copy"),
  tableCta: document.getElementById("table-cta"),
  dashboardViewLinks: document.querySelectorAll("[data-dashboard-view]"),
  pricingToggleMonthly: document.getElementById("toggle-monthly"),
  pricingToggleYearly: document.getElementById("toggle-yearly"),
  proPrice: document.getElementById("pro-price"),
};

function initFirebase() {
  if (!firebaseApp) {
    firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
    try {
      getAnalytics(firebaseApp);
    } catch (error) {
      console.warn("Analytics niet beschikbaar:", error);
    }
  }
  if (!auth) {
    auth = getAuth(firebaseApp);
    auth.languageCode = "nl";
  }
  if (!firestore) {
    firestore = getFirestore(firebaseApp);
  }
}

function closeMobileMenus() {
  document.querySelectorAll(".mobile-menu").forEach((menu) => menu.classList.remove("open"));
  document.querySelectorAll(".nav-burger").forEach((burger) => burger.classList.remove("open"));
}

function openSidebar() {
  els.sidebarDash?.classList.add("open");
  els.overlayDash?.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeSidebar() {
  els.sidebarDash?.classList.remove("open");
  els.overlayDash?.classList.remove("open");
  document.body.style.overflow = "";
  els.dashboardAccountMenu?.classList.remove("open");
}

function showPage(id) {
  if ((id === "page-dashboard") && !currentUser) {
    id = "page-signin";
  }

  currentPageId = id;
  els.pages.forEach((page) => page.classList.toggle("active", page.id === id));
  closeMobileMenus();
  closeSidebar();
  closeAccountModal();
  window.scrollTo(0, 0);
}

function setStatus(element, message, variant = "info") {
  if (!element) return;
  if (!message) {
    element.hidden = true;
    element.textContent = "";
    element.dataset.variant = "";
    return;
  }
  element.hidden = false;
  element.dataset.variant = variant;
  element.textContent = message;
}

function setLoadingState(button, isLoading, label) {
  if (!button) return;
  if (isLoading) {
    if (!button.dataset.originalLabel) {
      button.dataset.originalLabel = button.textContent;
    }
    button.disabled = true;
    button.textContent = label;
  } else {
    button.disabled = false;
    if (button.dataset.originalLabel) {
      button.textContent = button.dataset.originalLabel;
    }
  }
}

function getInitials(user) {
  const base = user?.displayName || user?.email || "A";
  return base.trim().charAt(0).toUpperCase();
}

function getAvatarMarkup(user) {
  if (user?.photoURL) {
    return `<img src="${user.photoURL}" alt="Profielfoto" referrerpolicy="no-referrer" />`;
  }
  return getInitials(user);
}

function formatDate(value) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value.toDate?.() || value;
  if (Number.isNaN(date?.getTime?.())) return "—";
  return new Intl.DateTimeFormat("nl-NL", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function getProviderLabel(user) {
  const providerId = user?.providerData?.[0]?.providerId || user?.providerId;
  if (providerId === "google.com") return "Google";
  if (providerId === "password" || providerId === "emailLink") return "Email";
  return providerId ? providerId.replace(".com", "") : "Email";
}

function hasLocalPlusStatus() {
  return localStorage.getItem(plusLocalKey) === "true";
}

async function savePlusStatusToCloud(user) {
  try {
    await setDoc(
      doc(firestore, "users", user.uid),
      {
        hasBinasPlus: true,
        plusLinkedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    localStorage.removeItem(plusLocalKey);
    return true;
  } catch (error) {
    console.error("Error saving Plus status to cloud:", error);
    return false;
  }
}

async function checkCloudPlusStatus(user) {
  try {
    const userDoc = await getDoc(doc(firestore, "users", user.uid));
    if (userDoc.exists() && userDoc.data().hasBinasPlus) {
      return true;
    }

    const paymentsSnap = await getDocs(collection(firestore, "customers", user.uid, "payments"));
    if (!paymentsSnap.empty) {
      for (const paymentDoc of paymentsSnap.docs) {
        if (paymentDoc.data().status === "succeeded") {
          return true;
        }
      }
    }

    const subSnap = await getDocs(
      query(
        collection(firestore, "customers", user.uid, "subscriptions"),
        where("status", "in", ["active", "trialing"])
      )
    );
    return !subSnap.empty;
  } catch (error) {
    console.error("Error checking cloud Plus status:", error);
    return false;
  }
}

async function getDashboardContext(user) {
  const userDocSnap = await getDoc(doc(firestore, "users", user.uid));
  const customerDocSnap = await getDoc(doc(firestore, "customers", user.uid));
  const paymentsSnap = await getDocs(collection(firestore, "customers", user.uid, "payments"));
  const subscriptionsSnap = await getDocs(collection(firestore, "customers", user.uid, "subscriptions"));

  return {
    userDoc: userDocSnap.exists() ? userDocSnap.data() : {},
    customerDoc: customerDocSnap.exists() ? customerDocSnap.data() : {},
    paymentsCount: paymentsSnap.size,
    subscriptionsCount: subscriptionsSnap.size,
  };
}

function updatePricingCopy() {
  const price = BINAS_CONFIG?.priceDisplay ? `€ ${BINAS_CONFIG.priceDisplay}` : "€ 1,49";
  els.proPrice.innerHTML = `${price} <span>/eenmalig</span>`;
  els.pricingToggleMonthly?.classList.add("active");
  els.pricingToggleYearly?.classList.remove("active");
}

function updateAuthNavigation() {
  document.querySelectorAll(".nav-auth-logged-out").forEach((node) => {
    node.classList.toggle("hidden", Boolean(currentUser));
  });
  document.querySelectorAll(".nav-auth-logged-in").forEach((node) => {
    node.classList.toggle("hidden", !currentUser);
  });
}

function buildTableRows() {
  const rows = [];
  const joinedLabel = formatDate(currentUser?.metadata?.creationTime);
  const customerId = dashboardContext?.customerDoc?.stripeCustomerId || dashboardContext?.customerDoc?.stripeId || "—";

  rows.push({
    name: currentUser?.displayName || "Eigen account",
    email: currentUser?.email || "Niet ingelogd",
    role: getProviderLabel(currentUser),
    joined: joinedLabel,
    status: '<span class="badge badge-green">Active</span>',
  });

  rows.push({
    name: "Premium access",
    email: isPremiumUser ? "Toegang actief" : "Nog niet actief",
    role: currentPlanLabel,
    joined: joinedLabel,
    status: isPremiumUser
      ? '<span class="badge badge-blue">Premium</span>'
      : '<span class="badge badge-gray">Free</span>',
  });

  rows.push({
    name: "Stripe customer",
    email: customerId,
    role: `${dashboardContext?.paymentsCount ?? 0} payments`,
    joined: formatDate(dashboardContext?.customerDoc?.updatedAt),
    status: customerId !== "—"
      ? '<span class="badge badge-green">Synced</span>'
      : '<span class="badge badge-yellow">Pending</span>',
  });

  rows.push({
    name: "Firestore user doc",
    email: dashboardContext?.userDoc?.plusLinkedAt || "Nog geen plusLink",
    role: `${dashboardContext?.subscriptionsCount ?? 0} subscriptions`,
    joined: formatDate(dashboardContext?.customerDoc?.premium?.updatedAt),
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

function updateAccountSurfaces() {
  updateAuthNavigation();

  const userName = currentUser?.displayName?.trim() || currentUser?.email || "Gast gebruiker";
  const userEmail = currentUser?.email || "Niet ingelogd";
  const avatarMarkup = getAvatarMarkup(currentUser);

  els.dashboardGreeting.textContent = currentUser
    ? `Good afternoon, ${currentUser.displayName?.split(" ")[0] || currentUser.email?.split("@")[0] || "builder"} 👋`
    : "Good afternoon 👋";

  els.dashboardUserName.textContent = userName;
  els.dashboardUserEmail.textContent = userEmail;
  els.dashboardUserAvatar.innerHTML = avatarMarkup;
  els.ctxUserName.textContent = userName;
  els.ctxUserEmail.textContent = userEmail;

  els.modalUserName.textContent = userName;
  els.modalUserEmail.textContent = userEmail;
  els.modalAvatar.innerHTML = avatarMarkup;

  const customerId = dashboardContext?.customerDoc?.stripeCustomerId || dashboardContext?.customerDoc?.stripeId || "—";
  const providerLabel = getProviderLabel(currentUser);

  els.statPlan.textContent = currentPlanLabel;
  els.statPlanCopy.textContent = isPremiumUser ? "Premium actief en gekoppeld" : "Premium niet actief";
  els.statProvider.textContent = providerLabel;
  els.statProviderCopy.textContent = currentUser?.providerData?.[0]?.providerId === "google.com" ? "Google login" : "Magic link login";
  els.statCustomer.textContent = customerId === "—" ? "—" : customerId.slice(0, 8);
  els.statCustomerCopy.textContent = customerId === "—" ? "Nog niet gesynchroniseerd" : "Stripe customer gekoppeld";
  els.statFirestore.textContent = currentUser ? "Synced" : "Ready";
  els.statFirestoreCopy.textContent = currentUser ? "Realtime accountstatus geladen" : "Log in voor accountdata";

  els.pricingPlan.textContent = isPremiumUser ? "Premium actief" : "Free plan";
  els.pricingCopy.textContent = currentUser
    ? isPremiumUser
      ? "Je account en premium-status zijn gekoppeld aan Firebase en Stripe."
      : "Je bent ingelogd. Start checkout om premium aan je account te koppelen."
    : "Log in om je account en premium-status te synchroniseren.";

  els.modalPlan.textContent = currentPlanLabel;
  els.modalPlanCopy.textContent = isPremiumUser
    ? "Premium is actief en zichtbaar in je dashboard."
    : currentUser
      ? "Start checkout om premium aan dit account te koppelen."
      : "Log in of gebruik Google om je account te openen.";

  if (els.tableBody) {
    els.tableBody.innerHTML = currentUser ? buildTableRows() : "";
  }

  const ctaText = isPremiumUser ? "Premium active" : "Upgrade to Pro";
  els.dashboardCheckoutCta.textContent = ctaText;
  els.modalCheckoutBtn.textContent = isPremiumUser ? "Premium active" : "Start checkout";
}

async function refreshAccountState(user, options = {}) {
  currentUser = user && !user.isAnonymous ? user : null;

  if (!currentUser) {
    dashboardContext = null;
    isPremiumUser = hasLocalPlusStatus();
    currentPlanLabel = isPremiumUser ? "Premium" : "Free";
    updateAccountSurfaces();
    if (currentPageId === "page-dashboard") {
      showPage("page-signin");
    }
    return;
  }

  const hasCloudPlus = await checkCloudPlusStatus(currentUser);
  if (!hasCloudPlus && hasLocalPlusStatus()) {
    await savePlusStatusToCloud(currentUser);
  }

  isPremiumUser = hasCloudPlus || hasLocalPlusStatus();
  currentPlanLabel = isPremiumUser ? "Premium" : "Free";
  dashboardContext = await getDashboardContext(currentUser);
  updateAccountSurfaces();

  if (options.showDashboard) {
    showPage("page-dashboard");
  }
}

async function sendMagicLink(email, statusEl, submitButton, mode = "signin") {
  if (!email) {
    setStatus(statusEl, "Vul een geldig e-mailadres in.", "error");
    return;
  }

  initFirebase();
  setLoadingState(submitButton, true, "Sending...");
  setStatus(statusEl, "", "info");

  try {
    await sendSignInLinkToEmail(auth, email, {
      url: window.location.href,
      handleCodeInApp: true,
    });
    localStorage.setItem(storedEmailKey, email);
    const message = mode === "signup"
      ? "Magic link verstuurd. Open je e-mail om je account te activeren."
      : "Magic link verstuurd. Open je e-mail om in te loggen.";
    setStatus(statusEl, message, "success");
  } catch (error) {
    console.error(error);
    setStatus(statusEl, error.message || "Kon de magic link niet versturen.", "error");
  } finally {
    setLoadingState(submitButton, false);
  }
}

async function signInWithGoogle(statusEl, button) {
  initFirebase();
  setLoadingState(button, true, "Opening Google...");
  setStatus(statusEl, "", "info");

  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    currentUser = result.user;
    setStatus(statusEl, "Succesvol ingelogd met Google.", "success");
    showPage("page-dashboard");
  } catch (error) {
    console.error(error);
    setStatus(statusEl, error.message || "Google login mislukt.", "error");
  } finally {
    setLoadingState(button, false);
  }
}

async function startCheckout(statusTarget = els.pricingStatus) {
  if (isPremiumUser) {
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
  checkoutButtons.forEach((button) => setLoadingState(button, true, "Opening checkout...") );
  setStatus(statusTarget, "", "info");

  try {
    const { signInAnonymously } = await import("https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js");
    const wasLoggedIn = auth.currentUser && !auth.currentUser.isAnonymous;

    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }

    const sessionData = {
      mode: "payment",
      price: BINAS_CONFIG?.stripePriceId || "price_1SmVggLzjWXxGtsShYIXmRVx",
      success_url: `${window.location.origin}/?status=success&anonymous=${!wasLoggedIn}`,
      cancel_url: `${window.location.origin}/?status=cancel`,
    };

    if (auth.currentUser?.email) {
      sessionData.customer_email = auth.currentUser.email;
    }

    const sessionsRef = collection(firestore, "customers", auth.currentUser.uid, "checkout_sessions");
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
    console.error(error);
    setStatus(statusTarget, `Fout bij checkout: ${error.message}`, "error");
  } finally {
    checkoutButtons.forEach((button) => setLoadingState(button, false));
  }
}

async function completeMagicLinkSignIn() {
  initFirebase();
  if (!isSignInWithEmailLink(auth, window.location.href)) {
    return;
  }

  let email = localStorage.getItem(storedEmailKey);
  if (!email) {
    email = window.prompt("Bevestig je e-mailadres om in te loggen:");
  }

  if (!email) {
    setStatus(els.signinStatus, "Login geannuleerd: geen e-mailadres bevestigd.", "error");
    return;
  }

  try {
    const result = await signInWithEmailLink(auth, email, window.location.href);
    currentUser = result.user;
    localStorage.removeItem(storedEmailKey);
    const pendingName = localStorage.getItem(pendingNameKey);
    if (pendingName && !result.user.displayName) {
      await updateProfile(result.user, { displayName: pendingName });
      localStorage.removeItem(pendingNameKey);
    }
    window.history.replaceState({}, document.title, window.location.pathname);
    setStatus(els.signinStatus, "Succesvol ingelogd met magic link.", "success");
    showPage("page-dashboard");
  } catch (error) {
    console.error(error);
    setStatus(els.signinStatus, error.message || "Magic link login mislukt.", "error");
  }
}

function openAccountModal() {
  els.accountModalShell.classList.remove("hidden");
  els.accountModalShell.setAttribute("aria-hidden", "false");
}

function closeAccountModal() {
  els.accountModalShell.classList.add("hidden");
  els.accountModalShell.setAttribute("aria-hidden", "true");
}

function toggleAccountMenu() {
  const wasOpen = els.dashboardAccountMenu.classList.contains("open");
  els.dashboardAccountMenu.classList.toggle("open", !wasOpen);
}

function bindEvents() {
  els.routeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      showPage(button.dataset.route);
    });
  });

  els.mobileMenuLinks.forEach((button) => {
    button.addEventListener("click", () => showPage(button.dataset.route));
  });

  els.burgerButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const menu = document.getElementById(button.dataset.menuTarget);
      const isOpen = menu?.classList.contains("open");
      closeMobileMenus();
      if (!isOpen) {
        menu?.classList.add("open");
        button.classList.add("open");
      }
    });
  });

  els.faqButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const item = button.closest(".faq-item");
      const isOpen = item.classList.contains("open");
      document.querySelectorAll(".faq-item").forEach((faq) => faq.classList.remove("open"));
      item.classList.toggle("open", !isOpen);
    });
  });

  els.pricingToggleMonthly?.addEventListener("click", () => {
    els.pricingToggleMonthly.classList.add("active");
    els.pricingToggleYearly.classList.remove("active");
    updatePricingCopy();
  });
  els.pricingToggleYearly?.addEventListener("click", () => {
    els.pricingToggleMonthly.classList.remove("active");
    els.pricingToggleYearly.classList.add("active");
    const basePrice = Number.parseFloat((BINAS_CONFIG?.priceDisplay || "1.49").replace(",", "."));
    const yearlyPrice = Number.isFinite(basePrice) ? (basePrice * 0.8).toFixed(2).replace(".", ",") : "1,19";
    els.proPrice.innerHTML = `€ ${yearlyPrice} <span>/eenmalig</span>`;
  });

  els.signinForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    await sendMagicLink(els.signinEmail.value.trim(), els.signinStatus, els.signinSubmit, "signin");
  });

  els.signupForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    localStorage.setItem(pendingNameKey, els.signupName.value.trim());
    await sendMagicLink(els.signupEmail.value.trim(), els.signupStatus, els.signupSubmit, "signup");
  });

  els.signinGoogle?.addEventListener("click", () => signInWithGoogle(els.signinStatus, els.signinGoogle));
  els.signupGoogle?.addEventListener("click", () => signInWithGoogle(els.signupStatus, els.signupGoogle));

  els.pricingCheckoutBtn?.addEventListener("click", () => startCheckout(els.pricingStatus));
  els.dashboardCheckoutCta?.addEventListener("click", () => startCheckout(els.dashboardStatus));
  els.dashboardSidebarCheckout?.addEventListener("click", () => startCheckout(els.dashboardStatus));
  els.modalCheckoutBtn?.addEventListener("click", () => startCheckout(els.modalStatus));

  [els.navOpenAccount, els.mobileOpenAccount, ...els.pricingAccountButtons].forEach((button) => {
    button?.addEventListener("click", openAccountModal);
  });

  els.modalDashboardBtn?.addEventListener("click", () => {
    closeAccountModal();
    showPage(currentUser ? "page-dashboard" : "page-signin");
  });

  els.modalLogoutBtn?.addEventListener("click", async () => {
    if (!auth || !auth.currentUser) return;
    await signOut(auth);
    closeAccountModal();
    showPage("page-landing");
  });

  els.accountModalBackdrop?.addEventListener("click", closeAccountModal);
  els.accountModalClose?.addEventListener("click", closeAccountModal);

  els.dashboardOpenSidebar?.addEventListener("click", openSidebar);
  els.overlayDash?.addEventListener("click", closeSidebar);
  els.dashboardUserTrigger?.addEventListener("click", toggleAccountMenu);
  els.dashboardSignout?.addEventListener("click", async () => {
    if (!auth || !auth.currentUser) return;
    await signOut(auth);
    showPage("page-landing");
  });

  els.ctxOpenBilling?.addEventListener("click", () => {
    els.dashboardAccountMenu.classList.remove("open");
    showPage("page-pricing");
  });

  els.ctxOpenPricing?.addEventListener("click", () => {
    els.dashboardAccountMenu.classList.remove("open");
    showPage("page-pricing");
  });

  els.tableCta?.addEventListener("click", () => showPage("page-pricing"));

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".sidebar-user-wrap")) {
      els.dashboardAccountMenu?.classList.remove("open");
    }
    if (!event.target.closest(".nav")) {
      closeMobileMenus();
    }
  });

  document.addEventListener(
    "touchstart",
    (event) => {
      document.body.dataset.touchStartX = String(event.touches[0].clientX);
    },
    { passive: true }
  );
  document.addEventListener(
    "touchend",
    (event) => {
      const startX = Number(document.body.dataset.touchStartX || 0);
      if (startX - event.changedTouches[0].clientX > 60) {
        closeSidebar();
      }
    },
    { passive: true }
  );
}

async function initAuth() {
  initFirebase();
  await completeMagicLinkSignIn();

  onAuthStateChanged(auth, async (user) => {
    await refreshAccountState(user, { showDashboard: currentPageId === "page-dashboard" && Boolean(user) });

    const params = new URLSearchParams(window.location.search);
    if (params.get("status") === "success") {
      if (params.get("anonymous") === "true") {
        localStorage.setItem(plusLocalKey, "true");
      }
      isPremiumUser = true;
      currentPlanLabel = "Premium";
      setStatus(els.pricingStatus, "Checkout voltooid. Je premium-status wordt gesynchroniseerd.", "success");
      window.history.replaceState({}, document.title, window.location.pathname);
      await refreshAccountState(user);
    }

    if (params.get("status") === "cancel") {
      setStatus(els.pricingStatus, "Checkout geannuleerd.", "info");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  });
}

function init() {
  updatePricingCopy();
  bindEvents();
  updateAccountSurfaces();
  initAuth();
}

init();
