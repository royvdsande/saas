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
  signInWithEmailLink,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import APP_CONFIG_DEFAULT from './config.js';

const LOCAL_CONFIG_KEY = 'binas:admin-config-override';
let APP_CONFIG = { ...APP_CONFIG_DEFAULT };
try {
  const localOverride = localStorage.getItem(LOCAL_CONFIG_KEY);
  if (localOverride) {
    APP_CONFIG = { ...APP_CONFIG, ...JSON.parse(localOverride) };
  }
} catch (error) {
  console.warn('Could not load local config override:', error);
}

const firebaseAuthDomain = APP_CONFIG?.authDomain || 'account.binas.app';
const firebaseConfig = {
  apiKey: "AIzaSyBgXo3zllXtFJZDn4elpY8DemEQG_ltMk0",
  authDomain: firebaseAuthDomain,
  projectId: "binas-91a32",
  storageBucket: "binas-91a32.firebasestorage.app",
  messagingSenderId: "971498903694",
  appId: "1:971498903694:web:5ab8b630b183f5204ed1df",
  measurementId: "G-1LLBGZNRNC",
};

const sectionButtons = [...document.querySelectorAll('.sidebar-link')];
const sectionPanels = [...document.querySelectorAll('.section-panel')];
const billingModal = document.getElementById('billing-modal');
const billingModalClose = document.getElementById('billing-modal-close');
const billingTriggers = [
  document.getElementById('open-billing-modal'),
  document.getElementById('hero-upgrade-button'),
].filter(Boolean);
const startCheckoutButton = document.getElementById('start-checkout');
const billingMessage = document.getElementById('billing-message');
const premiumStatusTitle = document.getElementById('premium-status-title');
const premiumStatusCopy = document.getElementById('premium-status-copy');
const premiumStatusPill = document.getElementById('premium-status-pill');
const premiumStatusDetail = document.getElementById('premium-status-detail');
const settingsPremiumInfo = document.getElementById('settings-premium-info');
const settingsVersionInfo = document.getElementById('settings-version-info');
const settingsUserInfo = document.getElementById('settings-user-info');
const sidebarAccountName = document.getElementById('sidebar-account-name');
const sidebarAccountEmail = document.getElementById('sidebar-account-email');
const accountName = document.getElementById('account-name');
const accountEmail = document.getElementById('account-email');
const sidebarLogout = document.getElementById('sidebar-logout');
const dashboardLogout = document.getElementById('dashboard-logout');
const sidebarAdminLink = document.getElementById('sidebar-admin-link');
const dashboardTitle = document.getElementById('dashboard-title');
const footerCredit = document.getElementById('footer-credit');

let firebaseApp;
let auth;
let db;
let currentUser = null;
let isPremiumUser = false;

function initFirebase() {
  if (!firebaseApp) {
    firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
    try {
      getAnalytics(firebaseApp);
    } catch (error) {
      console.warn('Analytics unavailable:', error);
    }
  }

  if (!auth) {
    auth = getAuth(firebaseApp);
    auth.languageCode = 'nl';
  }

  if (!db) {
    db = getFirestore(firebaseApp);
  }
}

function applyConfigCopy() {
  settingsVersionInfo.textContent = APP_CONFIG?.version || 'Version 1.0.0';
  document.querySelectorAll('.config-price').forEach((element) => {
    element.textContent = `€${APP_CONFIG?.priceDisplay || '1,49'}`;
  });
  document.querySelectorAll('.config-original-price').forEach((element) => {
    element.textContent = `€${APP_CONFIG?.originalPrice || '2,99'}`;
  });
  document.querySelectorAll('.config-discount-badge').forEach((element) => {
    element.textContent = `${APP_CONFIG?.discountPercentage || '50'}% OFF`;
  });
  if (footerCredit) {
    footerCredit.hidden = APP_CONFIG?.showCredit === false;
  }
}

function setSection(activeSection) {
  sectionButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.section === activeSection);
  });

  sectionPanels.forEach((panel) => {
    const shouldShow = panel.id === `section-${activeSection}`;
    panel.hidden = !shouldShow;
    panel.classList.toggle('active', shouldShow);
  });
}

async function isAdmin(email) {
  if (!email) return false;

  const normalizedEmail = email.toLowerCase();
  if ((APP_CONFIG?.primaryAdmin || '').toLowerCase() === normalizedEmail) {
    return true;
  }

  try {
    const adminDoc = await getDoc(doc(db, 'admins', normalizedEmail));
    return adminDoc.exists();
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

async function syncPremiumState(user) {
  isPremiumUser = false;
  if (!user) {
    renderPremiumState();
    return;
  }

  try {
    const token = await user.getIdToken();
    const response = await fetch(`/api/check-premium?email=${encodeURIComponent(user.email || '')}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const payload = await response.json().catch(() => ({}));
    isPremiumUser = response.ok && payload.isPremium === true;
  } catch (error) {
    console.error('Premium verification failed:', error);
    isPremiumUser = false;
  }

  renderPremiumState();
}

function renderPremiumState() {
  if (isPremiumUser) {
    premiumStatusTitle.textContent = 'Premium feature active';
    premiumStatusCopy.textContent = 'This account already has premium access through the preserved Stripe workflow.';
    premiumStatusPill.textContent = 'Active';
    premiumStatusDetail.textContent = 'Stripe + Firebase verification succeeded.';
    settingsPremiumInfo.textContent = 'Enabled';
    billingMessage.textContent = 'Your account already has premium access.';
  } else {
    premiumStatusTitle.textContent = 'Premium feature locked';
    premiumStatusCopy.textContent = 'Upgrade to test your boilerplate billing, entitlement, and post-purchase flows.';
    premiumStatusPill.textContent = 'Locked';
    premiumStatusDetail.textContent = 'Checkout remains connected to the existing premium API routes.';
    settingsPremiumInfo.textContent = 'Upgrade available';
    billingMessage.textContent = currentUser
      ? 'You are signed in and ready to start checkout.'
      : 'Sign in on the landing page to start checkout.';
  }
}

async function handleCheckout() {
  if (!currentUser) {
    billingMessage.textContent = 'Please sign in on the landing page before starting checkout.';
    return;
  }

  if (isPremiumUser) {
    billingMessage.textContent = 'This account already has premium access.';
    return;
  }

  startCheckoutButton.disabled = true;
  billingMessage.textContent = 'Creating Stripe checkout session…';

  try {
    const token = await currentUser.getIdToken();
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        email: currentUser.email,
        successUrl: `${window.location.origin}/?status=success`,
        cancelUrl: `${window.location.origin}/?status=cancel`,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.url) {
      throw new Error(payload.message || 'Could not create checkout session.');
    }

    window.location.href = payload.url;
  } catch (error) {
    billingMessage.textContent = error.message || 'Checkout failed.';
  } finally {
    startCheckoutButton.disabled = false;
  }
}

async function completeEmailLinkSignIn() {
  if (!auth || !isSignInWithEmailLink(auth, window.location.href)) {
    return;
  }

  const email = window.localStorage.getItem('emailForSignIn');
  if (!email) {
    billingMessage.textContent = 'Open the sign-in link from the same browser where you requested it.';
    return;
  }

  try {
    await signInWithEmailLink(auth, email, window.location.href);
    window.localStorage.removeItem('emailForSignIn');
    window.history.replaceState({}, document.title, window.location.pathname);
    billingMessage.textContent = 'Your sign-in link has been confirmed.';
  } catch (error) {
    console.error('Email link sign-in failed:', error);
    billingMessage.textContent = 'The sign-in link could not be completed.';
  }
}

function renderAuthState(user, adminAccess) {
  currentUser = user;

  if (user) {
    const displayName = user.displayName || user.email || 'Signed in user';
    dashboardTitle.textContent = `Welcome back, ${displayName}`;
    sidebarAccountName.textContent = displayName;
    sidebarAccountEmail.textContent = user.email || 'Authenticated account';
    accountName.textContent = displayName;
    accountEmail.textContent = user.email || 'Authenticated account';
    settingsUserInfo.textContent = user.email || displayName;
    sidebarLogout.hidden = false;
    dashboardLogout.hidden = false;
    sidebarAdminLink.hidden = !adminAccess;
  } else {
    dashboardTitle.textContent = 'Welcome to your SaaS workspace';
    sidebarAccountName.textContent = 'Guest';
    sidebarAccountEmail.textContent = 'Not logged in';
    accountName.textContent = 'Guest';
    accountEmail.textContent = 'Use the landing page to sign in with Google or email link.';
    settingsUserInfo.textContent = 'Guest';
    sidebarLogout.hidden = true;
    dashboardLogout.hidden = true;
    sidebarAdminLink.hidden = true;
  }
}

function openBillingModal(forceOpen) {
  billingModal.hidden = !forceOpen;
  document.body.classList.toggle('modal-open', forceOpen);
}

function registerEventListeners() {
  sectionButtons.forEach((button) => {
    button.addEventListener('click', () => setSection(button.dataset.section));
  });

  billingTriggers.forEach((trigger) => {
    trigger.addEventListener('click', () => openBillingModal(true));
  });

  billingModalClose?.addEventListener('click', () => openBillingModal(false));
  billingModal?.addEventListener('click', (event) => {
    if (event.target === billingModal) {
      openBillingModal(false);
    }
  });

  startCheckoutButton?.addEventListener('click', handleCheckout);
  sidebarLogout?.addEventListener('click', async () => {
    if (auth) {
      await signOut(auth);
    }
  });
  dashboardLogout?.addEventListener('click', async () => {
    if (auth) {
      await signOut(auth);
    }
  });
}

async function init() {
  initFirebase();
  applyConfigCopy();
  registerEventListeners();
  setSection('overview');
  await completeEmailLinkSignIn();

  onAuthStateChanged(auth, async (user) => {
    const adminAccess = user?.email ? await isAdmin(user.email) : false;
    renderAuthState(user, adminAccess);
    await syncPremiumState(user);
  });
}

init();
