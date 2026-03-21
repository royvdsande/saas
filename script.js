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
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
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
} catch {
  // Config override not available
}

const plusLocalKey = "binas:plus-local-status";
const storedEmailKey = "binas:premium-email";

let firebaseApp;
let auth;
let firestore;
let currentUser = null;
let isPremiumUser = false;
let currentPlanLabel = "Free";
let dashboardContext = null;
let currentPageId = "page-landing";
let signinMode = "password"; // "password" | "magic"

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
  signinPassword: document.getElementById("signin-password"),
  signupPassword: document.getElementById("signup-password"),
  signinPasswordField: document.getElementById("signin-password-field"),
  signinMagicInfo: document.getElementById("signin-magic-info"),
  signinModeToggle: document.getElementById("signin-mode-toggle"),
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
    } catch {
      // Analytics not available
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
  if (id === "page-dashboard" && !currentUser) {
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
      delete button.dataset.originalLabel;
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
  if (providerId === "password") return "Email";
  if (providerId === "emailLink") return "Email";
  return providerId ? providerId.replace(".com", "") : "Email";
}

function getProviderDescription(user) {
  const providerId = user?.providerData?.[0]?.providerId;
  if (providerId === "google.com") return "Ingelogd via Google";
  if (providerId === "emailLink") return "Ingelogd via magic link";
  if (providerId === "password") return "Ingelogd via wachtwoord";
  return "Email login";
}

function getFirebaseErrorMessage(code) {
  const messages = {
    "auth/email-already-in-use": "Dit e-mailadres is al in gebruik. Probeer in te loggen.",
    "auth/invalid-email": "Ongeldig e-mailadres. Controleer je invoer.",
    "auth/weak-password": "Wachtwoord is te zwak. Gebruik minimaal 6 tekens.",
    "auth/user-not-found": "Geen account gevonden met dit e-mailadres.",
    "auth/wrong-password": "Onjuist wachtwoord. Probeer het opnieuw.",
    "auth/invalid-credential": "Onjuiste inloggegevens. Controleer je e-mail en wachtwoord.",
    "auth/too-many-requests": "Te veel pogingen. Wacht even en probeer opnieuw.",
    "auth/user-disabled": "Dit account is uitgeschakeld. Neem contact op met support.",
    "auth/network-request-failed": "Netwerkfout. Controleer je internetverbinding.",
    "auth/popup-closed-by-user": null,
    "auth/cancelled-popup-request": null,
    "auth/popup-blocked": "Popup geblokkeerd. Sta popups toe voor deze site.",
    "auth/requires-recent-login": "Log opnieuw in om deze actie uit te voeren.",
  };
  if (code in messages) return messages[code];
  return "Er is iets misgegaan. Probeer het opnieuw.";
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
  } catch {
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
  } catch {
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

  const firstName = currentUser?.displayName?.split(" ")[0] || currentUser?.email?.split("@")[0] || "builder";
  const userName = currentUser?.displayName?.trim() || currentUser?.email || "Gast gebruiker";
  const userEmail = currentUser?.email || "Niet ingelogd";
  const avatarMarkup = getAvatarMarkup(currentUser);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Goedemorgen" : hour < 18 ? "Goedemiddag" : "Goedenavond";

  if (els.dashboardGreeting) {
    els.dashboardGreeting.textContent = currentUser
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

  const customerId = dashboardContext?.customerDoc?.stripeCustomerId || dashboardContext?.customerDoc?.stripeId || "—";
  const providerLabel = getProviderLabel(currentUser);

  if (els.statPlan) els.statPlan.textContent = currentPlanLabel;
  if (els.statPlanCopy) els.statPlanCopy.textContent = isPremiumUser ? "Premium actief en gekoppeld" : "Premium niet actief";
  if (els.statProvider) els.statProvider.textContent = providerLabel;
  if (els.statProviderCopy) els.statProviderCopy.textContent = currentUser ? getProviderDescription(currentUser) : "Niet ingelogd";
  if (els.statCustomer) els.statCustomer.textContent = customerId === "—" ? "—" : customerId.slice(0, 8);
  if (els.statCustomerCopy) els.statCustomerCopy.textContent = customerId === "—" ? "Nog niet gesynchroniseerd" : "Stripe customer gekoppeld";
  if (els.statFirestore) els.statFirestore.textContent = currentUser ? "Synced" : "Ready";
  if (els.statFirestoreCopy) els.statFirestoreCopy.textContent = currentUser ? "Realtime accountstatus geladen" : "Log in voor accountdata";

  if (els.pricingPlan) els.pricingPlan.textContent = isPremiumUser ? "Premium actief" : "Free plan";
  if (els.pricingCopy) {
    els.pricingCopy.textContent = currentUser
      ? isPremiumUser
        ? "Je account en premium-status zijn gekoppeld aan Firebase en Stripe."
        : "Je bent ingelogd. Start checkout om premium aan je account te koppelen."
      : "Log in om je account en premium-status te synchroniseren.";
  }

  if (els.modalPlan) els.modalPlan.textContent = currentPlanLabel;
  if (els.modalPlanCopy) {
    els.modalPlanCopy.textContent = isPremiumUser
      ? "Premium is actief en zichtbaar in je dashboard."
      : currentUser
        ? "Start checkout om premium aan dit account te koppelen."
        : "Log in of gebruik Google om je account te openen.";
  }

  if (els.tableBody) {
    els.tableBody.innerHTML = currentUser ? buildTableRows() : "";
  }

  const ctaText = isPremiumUser ? "Premium active" : "Upgrade to Pro";
  if (els.dashboardCheckoutCta) els.dashboardCheckoutCta.textContent = ctaText;
  if (els.modalCheckoutBtn) els.modalCheckoutBtn.textContent = isPremiumUser ? "Premium active" : "Start checkout";
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
  setLoadingState(submitButton, true, "Versturen...");
  setStatus(statusEl, "", "info");

  try {
    await sendSignInLinkToEmail(auth, email, {
      url: window.location.href,
      handleCodeInApp: true,
    });
    localStorage.setItem(storedEmailKey, email);
    const message = mode === "signup"
      ? "Magic link verstuurd! Controleer je inbox om je account te activeren."
      : "Magic link verstuurd! Controleer je inbox om in te loggen.";
    setStatus(statusEl, message, "success");
  } catch (error) {
    const msg = getFirebaseErrorMessage(error.code);
    setStatus(statusEl, msg || "Kon de magic link niet versturen.", "error");
  } finally {
    setLoadingState(submitButton, false);
  }
}

async function signUpWithEmailPassword(name, email, password, statusEl, button) {
  if (!name) {
    setStatus(statusEl, "Vul je naam in.", "error");
    return;
  }
  if (!email) {
    setStatus(statusEl, "Vul een e-mailadres in.", "error");
    return;
  }
  if (!password || password.length < 6) {
    setStatus(statusEl, "Wachtwoord moet minimaal 6 tekens zijn.", "error");
    return;
  }

  initFirebase();
  setLoadingState(button, true, "Account aanmaken...");
  setStatus(statusEl, "", "info");

  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: name });
    await sendEmailVerification(result.user);
    currentUser = result.user;
    setStatus(
      els.dashboardStatus,
      "Welkom! We hebben een verificatie-e-mail verstuurd. Controleer je inbox.",
      "info"
    );
    showPage("page-dashboard");
  } catch (error) {
    const msg = getFirebaseErrorMessage(error.code);
    setStatus(statusEl, msg, "error");
  } finally {
    setLoadingState(button, false);
  }
}

async function signInWithEmailPassword(email, password, statusEl, button) {
  if (!email) {
    setStatus(statusEl, "Vul een e-mailadres in.", "error");
    return;
  }
  if (!password) {
    setStatus(statusEl, "Vul je wachtwoord in.", "error");
    return;
  }

  initFirebase();
  setLoadingState(button, true, "Inloggen...");
  setStatus(statusEl, "", "info");

  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    currentUser = result.user;
    showPage("page-dashboard");
  } catch (error) {
    const msg = getFirebaseErrorMessage(error.code);
    setStatus(statusEl, msg, "error");
  } finally {
    setLoadingState(button, false);
  }
}

async function signInWithGoogle(statusEl, button) {
  initFirebase();
  setLoadingState(button, true, "Google openen...");
  setStatus(statusEl, "", "info");

  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    currentUser = result.user;
    showPage("page-dashboard");
  } catch (error) {
    const msg = getFirebaseErrorMessage(error.code);
    if (msg) {
      setStatus(statusEl, msg, "error");
    }
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
  checkoutButtons.forEach((button) => setLoadingState(button, true, "Checkout openen..."));
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
    window.history.replaceState({}, document.title, window.location.pathname);
    showPage("page-dashboard");
  } catch (error) {
    const msg = getFirebaseErrorMessage(error.code);
    setStatus(els.signinStatus, msg || "Magic link login mislukt.", "error");
    showPage("page-signin");
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

function setSigninMode(mode) {
  signinMode = mode;
  const isPassword = mode === "password";

  els.signinPasswordField?.classList.toggle("hidden", !isPassword);
  els.signinMagicInfo?.classList.toggle("hidden", isPassword);

  if (els.signinModeToggle) {
    els.signinModeToggle.textContent = isPassword ? "Stuur magic link" : "Gebruik wachtwoord";
  }
  if (els.signinSubmit) {
    els.signinSubmit.textContent = isPassword ? "Inloggen" : "Stuur magic link";
    els.signinSubmit.dataset.originalLabel = isPassword ? "Inloggen" : "Stuur magic link";
  }
  setStatus(els.signinStatus, "", "info");
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
    if (signinMode === "magic") {
      await sendMagicLink(els.signinEmail.value.trim(), els.signinStatus, els.signinSubmit, "signin");
    } else {
      await signInWithEmailPassword(
        els.signinEmail.value.trim(),
        els.signinPassword?.value || "",
        els.signinStatus,
        els.signinSubmit
      );
    }
  });

  els.signupForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    await signUpWithEmailPassword(
      els.signupName.value.trim(),
      els.signupEmail.value.trim(),
      els.signupPassword?.value || "",
      els.signupStatus,
      els.signupSubmit
    );
  });

  els.signinModeToggle?.addEventListener("click", () => {
    setSigninMode(signinMode === "password" ? "magic" : "password");
  });

  // Password visibility toggles
  document.querySelectorAll(".toggle-password").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = btn.closest(".field-wrap")?.querySelector("input[type='password'], input[type='text']");
      if (!input) return;
      input.type = input.type === "password" ? "text" : "password";
    });
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
    await refreshAccountState(user, {
      showDashboard: currentPageId === "page-dashboard" && Boolean(user),
    });

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
