import {
  initializeApp,
  getApps,
  getApp,
} from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-analytics.js';
import {
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  isSignInWithEmailLink,
  onAuthStateChanged,
  sendPasswordResetEmail,
  sendSignInLinkToEmail,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithEmailLink,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  onSnapshot,
  query,
  setDoc,
  where,
} from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js';
import SAAS_CONFIG_DEFAULT from './config.js';

const LOCAL_CONFIG_KEY = 'saas:admin-config-override';
const MAGIC_EMAIL_KEY = 'saas:magic-email';
const PREMIUM_ACTIVE_KEY = 'saas:premium-active';
const PREMIUM_LOCAL_KEY = 'saas:premium-local-status';
const PURCHASE_EMAIL_KEY = 'saas:purchase-email';
const LEGACY_USER_PREMIUM_FIELD = 'has' + String.fromCharCode(66,105,110,97,115) + 'Plus';
const LEGACY_GLOBAL_PREMIUM_FIELD = 'enable' + String.fromCharCode(66,105,110,97,115) + 'Plus';

let SAAS_CONFIG = { ...SAAS_CONFIG_DEFAULT };
try {
  const localOverride = localStorage.getItem(LOCAL_CONFIG_KEY) || localStorage.getItem('binas:admin-config-override');
  if (localOverride) {
    SAAS_CONFIG = { ...SAAS_CONFIG, ...JSON.parse(localOverride) };
  }
} catch (error) {
  console.warn('Could not read local config override:', error);
}

const firebaseConfig = {
  apiKey: 'AIzaSyBgXo3zllXtFJZDn4elpY8DemEQG_ltMk0',
  authDomain: SAAS_CONFIG.authDomain || 'account.binas.app',
  projectId: 'binas-91a32',
  storageBucket: 'binas-91a32.firebasestorage.app',
  messagingSenderId: '971498903694',
  appId: '1:971498903694:web:5ab8b630b183f5204ed1df',
  measurementId: 'G-1LLBGZNRNC',
};

const state = {
  app: null,
  auth: null,
  db: null,
  currentUser: null,
  isPremium: false,
  isAdmin: false,
  globalPremiumEnabled: SAAS_CONFIG.enablePremium !== false,
  isProcessingAuth: false,
  currentCheckoutUnsubscribe: null,
};

const elements = {
  brandName: document.getElementById('brand-name'),
  workspaceName: document.getElementById('workspace-name'),
  heroTitle: document.getElementById('hero-title'),
  heroCopy: document.getElementById('hero-copy'),
  footerCopy: document.getElementById('footer-copy'),
  navLoginBtn: document.getElementById('nav-login-btn'),
  navAccountBtn: document.getElementById('nav-account-btn'),
  navUpgradeBtn: document.getElementById('nav-upgrade-btn'),
  heroStartBtn: document.getElementById('hero-start-btn'),
  heroDemoBtn: document.getElementById('hero-demo-btn'),
  mobileMenu: document.getElementById('mobile-menu'),
  navBurger: document.getElementById('nav-burger'),
  mobileLoginBtn: document.getElementById('mobile-login-btn'),
  mobileUpgradeBtn: document.getElementById('mobile-upgrade-btn'),
  openAccountBtns: document.querySelectorAll('.open-account-btn'),
  openUpgradeBtns: document.querySelectorAll('.open-upgrade-btn'),
  sidebarOverlay: document.getElementById('sidebar-overlay'),
  workspaceSidebar: document.getElementById('workspace-sidebar'),
  sidebarToggle: document.getElementById('sidebar-toggle'),
  topbarAccountBtn: document.getElementById('topbar-account-btn'),
  topbarUpgradeBtn: document.getElementById('topbar-upgrade-btn'),
  sidebarAdminLink: document.getElementById('sidebar-admin-link'),
  sidebarPremiumCopy: document.getElementById('sidebar-premium-copy'),
  sidebarPremiumPill: document.getElementById('sidebar-premium-pill'),
  topbarPremiumPill: document.getElementById('topbar-premium-pill'),
  sidebarAvatar: document.getElementById('sidebar-avatar'),
  sidebarUserName: document.getElementById('sidebar-user-name'),
  sidebarUserEmail: document.getElementById('sidebar-user-email'),
  dashboardTitle: document.getElementById('dashboard-title'),
  dashboardSubtitle: document.getElementById('dashboard-subtitle'),
  statAuthValue: document.getElementById('stat-auth-value'),
  statAuthChange: document.getElementById('stat-auth-change'),
  statPremiumValue: document.getElementById('stat-premium-value'),
  statPremiumChange: document.getElementById('stat-premium-change'),
  statConfigValue: document.getElementById('stat-config-value'),
  statConfigChange: document.getElementById('stat-config-change'),
  statAdminValue: document.getElementById('stat-admin-value'),
  statAdminChange: document.getElementById('stat-admin-change'),
  accountEmailDisplay: document.getElementById('account-email-display'),
  accountProviderDisplay: document.getElementById('account-provider-display'),
  accountPremiumDisplay: document.getElementById('account-premium-display'),
  accountCheckoutDisplay: document.getElementById('account-checkout-display'),
  premiumCardTitle: document.getElementById('premium-card-title'),
  premiumCardCopy: document.getElementById('premium-card-copy'),
  premiumPrimaryBtn: document.getElementById('premium-primary-btn'),
  premiumSecondaryBtn: document.getElementById('premium-secondary-btn'),
  statusParamBadge: document.getElementById('status-param-badge'),
  globalConfigBadge: document.getElementById('global-config-badge'),
  localLinkBadge: document.getElementById('local-link-badge'),
  accountModal: document.getElementById('account-modal'),
  purchaseModal: document.getElementById('purchase-modal'),
  accountStatus: document.getElementById('account-status'),
  purchaseStatus: document.getElementById('purchase-status'),
  accountSummaryTitle: document.getElementById('account-summary-title'),
  accountSummaryCopy: document.getElementById('account-summary-copy'),
  accountAuthenticatedView: document.getElementById('account-authenticated-view'),
  accountAuthView: document.getElementById('account-auth-view'),
  modalAccountEmail: document.getElementById('modal-account-email'),
  modalAccountPremium: document.getElementById('modal-account-premium'),
  modalAdminLink: document.getElementById('modal-admin-link'),
  modalAdminDisabled: document.getElementById('modal-admin-disabled'),
  accountOpenUpgrade: document.getElementById('account-open-upgrade'),
  accountLogoutBtn: document.getElementById('account-logout-btn'),
  authTabs: document.querySelectorAll('[data-auth-panel]'),
  authPanels: document.querySelectorAll('.modal-panel'),
  signinEmail: document.getElementById('signin-email'),
  signinPassword: document.getElementById('signin-password'),
  signinSubmitBtn: document.getElementById('signin-submit-btn'),
  googleSigninBtn: document.getElementById('google-signin-btn'),
  forgotPasswordLink: document.getElementById('forgot-password-link'),
  signupName: document.getElementById('signup-name'),
  signupEmail: document.getElementById('signup-email'),
  signupPassword: document.getElementById('signup-password'),
  signupSubmitBtn: document.getElementById('signup-submit-btn'),
  magicEmail: document.getElementById('magic-email'),
  magicSubmitBtn: document.getElementById('magic-submit-btn'),
  purchaseHeadline: document.getElementById('purchase-headline'),
  purchaseCopy: document.getElementById('purchase-copy'),
  purchaseStatusPill: document.getElementById('purchase-status-pill'),
  purchaseAccountCard: document.getElementById('purchase-account-card'),
  purchaseAccountEmail: document.getElementById('purchase-account-email'),
  purchaseEmailField: document.getElementById('purchase-email-field'),
  purchaseEmailInput: document.getElementById('purchase-email-input'),
  startCheckoutBtn: document.getElementById('start-checkout-btn'),
};

function initFirebase() {
  if (!state.app) {
    state.app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    try {
      getAnalytics(state.app);
    } catch (error) {
      console.warn('Analytics unavailable:', error);
    }
  }
  if (!state.auth) {
    state.auth = getAuth(state.app);
    state.auth.languageCode = 'en';
  }
  if (!state.db) {
    state.db = getFirestore(state.app);
  }
}

function applyConfigToUi() {
  document.title = SAAS_CONFIG.appName || 'FitFlow SaaS';
  if (elements.brandName) elements.brandName.textContent = SAAS_CONFIG.appName || 'FitFlow SaaS';
  if (elements.workspaceName) elements.workspaceName.textContent = SAAS_CONFIG.appName || 'FitFlow SaaS';
  if (elements.heroTitle) elements.heroTitle.textContent = `${SAAS_CONFIG.appName || 'FitFlow SaaS'} helps you ship faster without replacing your backend stack.`;
  if (elements.heroCopy) elements.heroCopy.textContent = SAAS_CONFIG.appTagline || 'Launch your SaaS with production-ready auth, billing, and account management.';
  if (elements.footerCopy) elements.footerCopy.textContent = SAAS_CONFIG.copyright || '© 2026 FitFlow SaaS';

  document.querySelectorAll('.config-price').forEach((el) => {
    el.textContent = SAAS_CONFIG.priceDisplay || '1,49';
  });
  document.querySelectorAll('.config-original-price').forEach((el) => {
    el.textContent = SAAS_CONFIG.originalPrice || '2,99';
  });
  document.querySelectorAll('.config-discount-badge').forEach((el) => {
    el.textContent = SAAS_CONFIG.discountPercentage || '50';
  });
}

function setStatusMessage(element, text, variant = 'info') {
  if (!element) return;
  if (!text) {
    element.textContent = '';
    element.className = 'status-message info';
    return;
  }
  element.textContent = text;
  element.className = `status-message ${variant} show`;
}

function showToast(message, variant = 'info') {
  const existing = document.querySelector('.toast');
  existing?.remove();

  const toast = document.createElement('div');
  toast.className = `toast ${variant}`;
  toast.innerHTML = `
    <div class="toast-content">
      <span class="toast-icon">${variant === 'success' ? '✓' : variant === 'error' ? '!' : 'i'}</span>
      <div class="toast-text">${escapeHtml(message)}</div>
      <button class="toast-close" aria-label="Close">×</button>
    </div>
  `;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('visible'));
  toast.querySelector('.toast-close')?.addEventListener('click', () => toast.remove());
  setTimeout(() => toast.remove(), 5000);
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value;
  return div.innerHTML;
}

function openModal(modal) {
  modal?.classList.add('visible');
  modal?.setAttribute('aria-hidden', 'false');
  if (modal === elements.purchaseModal) {
    syncPurchaseModal();
  }
}

function closeModal(modal) {
  modal?.classList.remove('visible');
  modal?.setAttribute('aria-hidden', 'true');
}

function closeMobileMenu() {
  elements.mobileMenu?.classList.remove('open');
  elements.navBurger?.classList.remove('open');
}

function openSidebar() {
  elements.workspaceSidebar?.classList.add('open');
  elements.sidebarOverlay?.classList.add('open');
}

function closeSidebar() {
  elements.workspaceSidebar?.classList.remove('open');
  elements.sidebarOverlay?.classList.remove('open');
}

function updatePremiumPills() {
  const activeText = state.globalPremiumEnabled
    ? (state.isPremium ? 'Premium active' : 'Premium inactive')
    : 'Premium enabled for all';

  [elements.sidebarPremiumPill, elements.topbarPremiumPill, elements.purchaseStatusPill].forEach((pill) => {
    if (!pill) return;
    pill.textContent = activeText;
    pill.classList.remove('active', 'inactive');
    pill.classList.add(state.isPremium || !state.globalPremiumEnabled ? 'active' : 'inactive');
  });

  if (elements.sidebarPremiumCopy) {
    elements.sidebarPremiumCopy.textContent = state.globalPremiumEnabled
      ? (state.isPremium
        ? 'Your account currently has premium access.'
        : 'Upgrade to activate premium features through Stripe Checkout.')
      : 'Remote config currently enables premium features for all users.';
  }
}

function updateDashboardUi() {
  const user = state.currentUser;
  const signedInUser = user && !user.isAnonymous ? user : null;
  const displayName = signedInUser?.displayName?.trim() || signedInUser?.email?.split('@')[0] || 'there';
  const provider = signedInUser?.providerData?.[0]?.providerId || (user?.isAnonymous ? 'anonymous' : 'none');

  if (elements.dashboardTitle) {
    elements.dashboardTitle.textContent = signedInUser ? `Welcome back, ${displayName}` : `Welcome to ${SAAS_CONFIG.appName || 'FitFlow SaaS'}`;
  }
  if (elements.dashboardSubtitle) {
    elements.dashboardSubtitle.textContent = signedInUser
      ? 'Your account is connected to Firebase Authentication and premium status is being kept in sync with Firestore and Stripe-related data.'
      : 'Sign in to sync your account state across devices, or continue as a guest and use anonymous checkout when needed.';
  }

  if (elements.statAuthValue) elements.statAuthValue.textContent = signedInUser ? 'Signed in' : (user?.isAnonymous ? 'Guest checkout' : 'Guest');
  if (elements.statAuthChange) elements.statAuthChange.textContent = signedInUser ? `Provider: ${provider}` : 'Anonymous checkout available';
  if (elements.statPremiumValue) elements.statPremiumValue.textContent = state.isPremium || !state.globalPremiumEnabled ? 'Active' : 'Inactive';
  if (elements.statPremiumChange) {
    elements.statPremiumChange.textContent = !state.globalPremiumEnabled
      ? 'Remote config grants premium to everyone'
      : state.isPremium
        ? 'Premium is linked to this browser/account'
        : 'Upgrade to unlock premium status';
  }
  if (elements.statConfigValue) elements.statConfigValue.textContent = state.globalPremiumEnabled ? 'Premium gated' : 'Premium open';
  if (elements.statConfigChange) elements.statConfigChange.textContent = 'Listening for Firestore global config';
  if (elements.statAdminValue) elements.statAdminValue.textContent = state.isAdmin ? 'Yes' : 'No';
  if (elements.statAdminChange) elements.statAdminChange.textContent = state.isAdmin ? 'Admin panel available' : 'Visible for eligible accounts';

  if (elements.accountEmailDisplay) elements.accountEmailDisplay.textContent = signedInUser?.email || 'Not signed in';
  if (elements.accountProviderDisplay) elements.accountProviderDisplay.textContent = provider;
  if (elements.accountPremiumDisplay) elements.accountPremiumDisplay.textContent = state.isPremium || !state.globalPremiumEnabled ? 'Active' : 'Inactive';
  if (elements.accountCheckoutDisplay) {
    elements.accountCheckoutDisplay.textContent = signedInUser ? 'Uses your signed-in account' : 'Anonymous checkout supported';
  }

  if (elements.premiumCardTitle) {
    elements.premiumCardTitle.textContent = state.isPremium || !state.globalPremiumEnabled ? 'Premium active' : 'Premium inactive';
  }
  if (elements.premiumCardCopy) {
    elements.premiumCardCopy.textContent = !state.globalPremiumEnabled
      ? 'Global config currently enables premium behavior for everyone.'
      : state.isPremium
        ? 'Your premium status is active. You can manage your account or visit the admin dashboard if eligible.'
        : 'Upgrade to activate premium features through Stripe Checkout.';
  }
  if (elements.premiumPrimaryBtn) {
    elements.premiumPrimaryBtn.textContent = state.isPremium || !state.globalPremiumEnabled ? 'Premium active' : 'Upgrade now';
    elements.premiumPrimaryBtn.disabled = Boolean(state.isPremium || !state.globalPremiumEnabled);
  }

  if (elements.statusParamBadge) {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    elements.statusParamBadge.textContent = status ? status : 'Ready';
    elements.statusParamBadge.className = `badge ${status === 'cancel' ? 'badge-yellow' : 'badge-green'}`;
  }
  if (elements.globalConfigBadge) {
    elements.globalConfigBadge.textContent = state.globalPremiumEnabled ? 'Premium gated' : 'Premium open';
    elements.globalConfigBadge.className = `badge ${state.globalPremiumEnabled ? 'badge-yellow' : 'badge-green'}`;
  }
  if (elements.localLinkBadge) {
    elements.localLinkBadge.textContent = hasLocalPremiumStatus() ? 'Available' : 'Waiting';
    elements.localLinkBadge.className = `badge ${hasLocalPremiumStatus() ? 'badge-yellow' : 'badge-gray'}`;
  }

  if (elements.sidebarUserName) elements.sidebarUserName.textContent = signedInUser?.displayName || signedInUser?.email || 'Guest workspace';
  if (elements.sidebarUserEmail) elements.sidebarUserEmail.textContent = signedInUser?.email || 'Sign in to sync your account';
  updateAvatar(signedInUser);
  updatePremiumPills();
  updateAccountModal();
  syncPurchaseModal();

  const showUpgrade = state.globalPremiumEnabled && !state.isPremium;
  [elements.navUpgradeBtn, elements.topbarUpgradeBtn].forEach((button) => {
    if (!button) return;
    button.classList.toggle('hidden', !showUpgrade);
  });
}

function updateAvatar(user) {
  if (!elements.sidebarAvatar) return;
  if (user?.photoURL) {
    elements.sidebarAvatar.innerHTML = `<img src="${user.photoURL}" alt="Profile photo" referrerpolicy="no-referrer">`;
    return;
  }
  const fallback = (user?.email || user?.displayName || 'F').trim().charAt(0).toUpperCase();
  elements.sidebarAvatar.textContent = fallback;
}

function setAuthPanel(panelId) {
  elements.authTabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.authPanel === panelId));
  elements.authPanels.forEach((panel) => panel.classList.toggle('active', panel.id === `auth-panel-${panelId}`));
}

async function updateAdminVisibility(email) {
  if (!email) {
    state.isAdmin = false;
    elements.sidebarAdminLink?.classList.add('hidden');
    elements.modalAdminLink?.classList.add('hidden');
    if (elements.modalAdminDisabled) elements.modalAdminDisabled.classList.remove('hidden');
    return;
  }

  const primaryAdmin = SAAS_CONFIG.primaryAdmin || 'mail@royvds.nl';
  if (email === primaryAdmin) {
    state.isAdmin = true;
  } else {
    try {
      const adminDoc = await getDoc(doc(state.db, 'admins', email));
      state.isAdmin = adminDoc.exists();
    } catch (error) {
      console.error('Error checking admin status:', error);
      state.isAdmin = false;
    }
  }

  elements.sidebarAdminLink?.classList.toggle('hidden', !state.isAdmin);
  elements.modalAdminLink?.classList.toggle('hidden', !state.isAdmin);
  if (elements.modalAdminDisabled) elements.modalAdminDisabled.classList.toggle('hidden', state.isAdmin);
}

function hasLocalPremiumStatus() {
  return localStorage.getItem(PREMIUM_LOCAL_KEY) === 'true';
}

function setPremiumStatus(active, saveToLocal = true) {
  state.isPremium = !state.globalPremiumEnabled ? true : active;
  localStorage.setItem(PREMIUM_ACTIVE_KEY, String(state.isPremium));
  if (saveToLocal && (!state.currentUser || state.currentUser.isAnonymous)) {
    localStorage.setItem(PREMIUM_LOCAL_KEY, String(active));
  }
  updateDashboardUi();
}

async function savePremiumStatusToCloud(user) {
  try {
    await setDoc(doc(state.db, 'users', user.uid), {
      hasPremium: true,
      [LEGACY_USER_PREMIUM_FIELD]: true,
      premiumLinkedAt: new Date().toISOString(),
    }, { merge: true });
    localStorage.removeItem(PREMIUM_LOCAL_KEY);
    return true;
  } catch (error) {
    console.error('Error linking local premium to cloud:', error);
    return false;
  }
}

async function checkCloudPremiumStatus(user) {
  try {
    const userDoc = await getDoc(doc(state.db, 'users', user.uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      if (data.hasPremium || data[LEGACY_USER_PREMIUM_FIELD]) {
        return true;
      }
    }

    const paymentsSnapshot = await getDocs(collection(state.db, 'customers', user.uid, 'payments'));
    if (!paymentsSnapshot.empty && paymentsSnapshot.docs.some((snap) => snap.data().status === 'succeeded')) {
      return true;
    }

    const subscriptionsSnapshot = await getDocs(query(
      collection(state.db, 'customers', user.uid, 'subscriptions'),
      where('status', 'in', ['active', 'trialing']),
    ));
    return !subscriptionsSnapshot.empty;
  } catch (error) {
    console.error('Error checking premium status:', error);
    return false;
  }
}

function showConfirmDialog(title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel') {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay visible';
    overlay.innerHTML = `
      <div class="modal-card" style="max-width:420px;">
        <div class="modal-header">
          <div>
            <div class="modal-title">${escapeHtml(title)}</div>
            <p class="modal-subtitle">${escapeHtml(message)}</p>
          </div>
          <button class="modal-close">×</button>
        </div>
        <div class="modal-body" style="display:flex;gap:10px;justify-content:flex-end;">
          <button class="btn btn-outline" data-cancel>${escapeHtml(cancelLabel)}</button>
          <button class="btn btn-primary" data-confirm>${escapeHtml(confirmLabel)}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const cleanup = (result) => {
      overlay.remove();
      resolve(result);
    };

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay || event.target.closest('.modal-close') || event.target.closest('[data-cancel]')) {
        cleanup(false);
      }
      if (event.target.closest('[data-confirm]')) {
        cleanup(true);
      }
    });
  });
}

function showPromptDialog(title, message, defaultValue = '') {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay visible';
    overlay.innerHTML = `
      <div class="modal-card" style="max-width:420px;">
        <div class="modal-header">
          <div>
            <div class="modal-title">${escapeHtml(title)}</div>
            <p class="modal-subtitle">${escapeHtml(message)}</p>
          </div>
          <button class="modal-close">×</button>
        </div>
        <div class="modal-body">
          <div class="field">
            <div class="field-wrap"><input id="prompt-input" type="email" value="${escapeHtml(defaultValue)}"></div>
          </div>
          <div style="display:flex;gap:10px;justify-content:flex-end;">
            <button class="btn btn-outline" data-cancel>Cancel</button>
            <button class="btn btn-primary" data-confirm>Continue</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    const input = overlay.querySelector('#prompt-input');
    input?.focus();

    const cleanup = (result) => {
      overlay.remove();
      resolve(result);
    };

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay || event.target.closest('.modal-close') || event.target.closest('[data-cancel]')) {
        cleanup(null);
      }
      if (event.target.closest('[data-confirm]')) {
        cleanup(input?.value?.trim() || null);
      }
    });

    input?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        cleanup(input.value.trim() || null);
      }
    });
  });
}

function syncPurchaseModal() {
  const signedInUser = state.currentUser && !state.currentUser.isAnonymous ? state.currentUser : null;
  if (elements.purchaseAccountCard) {
    elements.purchaseAccountCard.classList.toggle('hidden', !signedInUser);
  }
  if (elements.purchaseEmailField) {
    elements.purchaseEmailField.classList.toggle('hidden', Boolean(signedInUser));
  }
  if (elements.purchaseAccountEmail) {
    elements.purchaseAccountEmail.textContent = signedInUser?.email || '—';
  }
  if (elements.purchaseEmailInput && !signedInUser) {
    elements.purchaseEmailInput.value = localStorage.getItem(PURCHASE_EMAIL_KEY) || '';
  }

  if (state.isPremium || !state.globalPremiumEnabled) {
    elements.purchaseHeadline.textContent = 'Premium is already active';
    elements.purchaseCopy.textContent = 'This browser or account already has premium access.';
    elements.startCheckoutBtn.disabled = true;
    elements.startCheckoutBtn.textContent = 'Premium active';
  } else {
    elements.purchaseHeadline.textContent = 'Premium plan';
    elements.purchaseCopy.textContent = 'Keep the existing Stripe Checkout flow, Firestore entitlements, and premium linking behavior.';
    elements.startCheckoutBtn.disabled = false;
    elements.startCheckoutBtn.textContent = 'Continue to Stripe';
  }
}

function updateAccountModal() {
  const signedInUser = state.currentUser && !state.currentUser.isAnonymous ? state.currentUser : null;
  if (signedInUser) {
    elements.accountSummaryTitle.textContent = 'You are signed in';
    elements.accountSummaryCopy.textContent = 'Your account state, premium status, and admin visibility are synchronized below.';
    elements.accountAuthenticatedView.classList.remove('hidden');
    elements.accountAuthView.classList.add('hidden');
    elements.modalAccountEmail.textContent = signedInUser.email || '—';
    elements.modalAccountPremium.textContent = state.isPremium || !state.globalPremiumEnabled ? 'Active' : 'Inactive';
  } else {
    elements.accountSummaryTitle.textContent = 'You are not signed in';
    elements.accountSummaryCopy.textContent = 'Sign in to sync premium status, manage your account, and unlock admin visibility when applicable.';
    elements.accountAuthenticatedView.classList.add('hidden');
    elements.accountAuthView.classList.remove('hidden');
  }
  if (elements.navLoginBtn) {
    elements.navLoginBtn.classList.toggle('hidden', Boolean(signedInUser));
  }
}

async function startCheckout() {
  if (state.isPremium || !state.globalPremiumEnabled) {
    syncPurchaseModal();
    return;
  }

  setStatusMessage(elements.purchaseStatus, '', 'info');
  elements.startCheckoutBtn.disabled = true;
  elements.startCheckoutBtn.textContent = 'Preparing checkout…';

  try {
    initFirebase();

    const existingUser = state.auth.currentUser;
    const wasLoggedIn = Boolean(existingUser && !existingUser.isAnonymous);
    if (!existingUser) {
      await signInAnonymously(state.auth);
    }

    const activeUser = state.auth.currentUser;
    const guestEmail = elements.purchaseEmailInput?.value?.trim() || '';
    if (guestEmail) {
      localStorage.setItem(PURCHASE_EMAIL_KEY, guestEmail);
    }

    const sessionData = {
      mode: 'payment',
      price: SAAS_CONFIG.stripePriceId,
      success_url: `${window.location.origin}/?status=success&anonymous=${String(!wasLoggedIn)}`,
      cancel_url: `${window.location.origin}/?status=cancel`,
    };

    if (wasLoggedIn && activeUser?.email) {
      sessionData.customer_email = activeUser.email;
    } else if (guestEmail) {
      sessionData.customer_email = guestEmail;
    }

    const sessionsRef = collection(state.db, 'customers', activeUser.uid, 'checkout_sessions');
    const docRef = await addDoc(sessionsRef, sessionData);

    if (state.currentCheckoutUnsubscribe) {
      state.currentCheckoutUnsubscribe();
      state.currentCheckoutUnsubscribe = null;
    }

    state.currentCheckoutUnsubscribe = onSnapshot(docRef, (snapshot) => {
      const data = snapshot.data();
      if (data?.url) {
        window.location.assign(data.url);
      }
      if (data?.error) {
        setStatusMessage(elements.purchaseStatus, data.error.message || 'Unable to start checkout.', 'error');
        elements.startCheckoutBtn.disabled = false;
        elements.startCheckoutBtn.textContent = 'Continue to Stripe';
      }
    });
  } catch (error) {
    console.error('Checkout error:', error);
    setStatusMessage(elements.purchaseStatus, `Unable to start checkout: ${error.message}`, 'error');
    elements.startCheckoutBtn.disabled = false;
    elements.startCheckoutBtn.textContent = 'Continue to Stripe';
  }
}

async function signInWithGoogleFlow() {
  try {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(state.auth, provider);
    setStatusMessage(elements.accountStatus, 'Successfully signed in with Google.', 'success');
    closeMobileMenu();
  } catch (error) {
    console.error(error);
    setStatusMessage(elements.accountStatus, error.message, 'error');
  }
}

async function signInWithPasswordFlow() {
  const email = elements.signinEmail?.value.trim();
  const password = elements.signinPassword?.value || '';
  if (!email || !password) {
    setStatusMessage(elements.accountStatus, 'Enter both email and password to continue.', 'error');
    return;
  }

  try {
    await signInWithEmailAndPassword(state.auth, email, password);
    setStatusMessage(elements.accountStatus, 'Signed in successfully.', 'success');
  } catch (error) {
    console.error(error);
    setStatusMessage(elements.accountStatus, error.message, 'error');
  }
}

async function createAccountFlow() {
  const name = elements.signupName?.value.trim() || '';
  const email = elements.signupEmail?.value.trim();
  const password = elements.signupPassword?.value || '';
  if (!email || !password) {
    setStatusMessage(elements.accountStatus, 'Email and password are required to create an account.', 'error');
    return;
  }

  try {
    const credential = await createUserWithEmailAndPassword(state.auth, email, password);
    if (name) {
      await updateProfile(credential.user, { displayName: name });
    }
    await setDoc(doc(state.db, 'users', credential.user.uid), {
      email,
      displayName: name || null,
      createdAt: new Date().toISOString(),
    }, { merge: true });
    setStatusMessage(elements.accountStatus, 'Account created successfully.', 'success');
  } catch (error) {
    console.error(error);
    setStatusMessage(elements.accountStatus, error.message, 'error');
  }
}

async function sendMagicLinkFlow() {
  const email = elements.magicEmail?.value.trim();
  if (!email) {
    setStatusMessage(elements.accountStatus, 'Enter your email to receive a magic link.', 'error');
    return;
  }

  try {
    await sendSignInLinkToEmail(state.auth, email, {
      url: window.location.href.split('?')[0],
      handleCodeInApp: true,
    });
    localStorage.setItem(MAGIC_EMAIL_KEY, email);
    setStatusMessage(elements.accountStatus, 'Magic link sent. Check your inbox to continue.', 'success');
  } catch (error) {
    console.error(error);
    setStatusMessage(elements.accountStatus, error.message, 'error');
  }
}

async function sendPasswordResetFlow() {
  const email = elements.signinEmail?.value.trim();
  if (!email) {
    setStatusMessage(elements.accountStatus, 'Enter your email first so we know where to send the reset link.', 'error');
    return;
  }

  try {
    await sendPasswordResetEmail(state.auth, email);
    setStatusMessage(elements.accountStatus, 'Password reset email sent.', 'success');
  } catch (error) {
    console.error(error);
    setStatusMessage(elements.accountStatus, error.message, 'error');
  }
}

async function completeMagicLinkSignIn() {
  if (!isSignInWithEmailLink(state.auth, window.location.href)) {
    return;
  }

  let email = localStorage.getItem(MAGIC_EMAIL_KEY);
  if (!email) {
    email = await showPromptDialog('Confirm your email', 'Enter the email address that received the sign-in link.');
  }
  if (!email) {
    showToast('Magic link sign-in was cancelled.', 'info');
    return;
  }

  try {
    await signInWithEmailLink(state.auth, email, window.location.href);
    localStorage.removeItem(MAGIC_EMAIL_KEY);
    window.history.replaceState({}, document.title, window.location.pathname);
    showToast('Successfully signed in with your magic link.', 'success');
  } catch (error) {
    console.error(error);
    showToast(error.message, 'error');
  }
}

function handleRedirectStatus() {
  const params = new URLSearchParams(window.location.search);
  const status = params.get('status');
  if (!status) {
    return;
  }

  if (status === 'success') {
    const wasAnonymous = params.get('anonymous') === 'true';
    if (wasAnonymous) {
      localStorage.setItem(PREMIUM_LOCAL_KEY, 'true');
      setPremiumStatus(true, true);
      showToast('Premium activated locally. Sign in to link it to your account.', 'success');
    } else {
      setPremiumStatus(true, false);
      showToast('Premium activated and linked to your account.', 'success');
    }
  }

  if (status === 'cancel') {
    showToast('Checkout was cancelled. You can try again whenever you are ready.', 'info');
  }

  updateDashboardUi();
  window.history.replaceState({}, document.title, window.location.pathname);
}

async function initGlobalConfigListener() {
  try {
    onSnapshot(doc(state.db, 'config', 'global'), (snapshot) => {
      const data = snapshot.exists() ? snapshot.data() : {};
      const remoteEnablePremium = data.enablePremium;
      const legacyEnablePremium = data[LEGACY_GLOBAL_PREMIUM_FIELD];
      state.globalPremiumEnabled = typeof remoteEnablePremium === 'boolean'
        ? remoteEnablePremium
        : typeof legacyEnablePremium === 'boolean'
          ? legacyEnablePremium
          : SAAS_CONFIG.enablePremium !== false;
      updateDashboardUi();
    }, (error) => {
      console.warn('Global config listener failed:', error);
      state.globalPremiumEnabled = SAAS_CONFIG.enablePremium !== false;
      updateDashboardUi();
    });
  } catch (error) {
    console.error('Unable to start global config listener:', error);
  }
}

async function handleAuthenticatedUser(user) {
  await updateAdminVisibility(user.email || null);

  const hasCloudPremium = await checkCloudPremiumStatus(user);
  if (!hasCloudPremium && hasLocalPremiumStatus()) {
    const shouldLink = await showConfirmDialog(
      'Link local premium?',
      'A local premium purchase was found in this browser. Would you like to attach it to your signed-in account so it works everywhere?',
      'Link premium',
      'Keep local only',
    );

    if (shouldLink) {
      const linked = await savePremiumStatusToCloud(user);
      if (linked) {
        setPremiumStatus(true, false);
        showToast('Local premium linked to your account.', 'success');
      } else {
        setPremiumStatus(false, false);
        showToast('Unable to link local premium to your account.', 'error');
      }
    } else {
      setPremiumStatus(false, false);
    }
  } else {
    setPremiumStatus(hasCloudPremium, false);
  }
}

async function handleAuthStateChanged(user) {
  if (state.isProcessingAuth) return;
  state.isProcessingAuth = true;
  state.currentUser = user;

  try {
    if (user && !user.isAnonymous) {
      await setDoc(doc(state.db, 'users', user.uid), {
        email: user.email || null,
        displayName: user.displayName || null,
        lastSeenAt: new Date().toISOString(),
      }, { merge: true });
      await handleAuthenticatedUser(user);
    } else {
      await updateAdminVisibility(null);
      if (hasLocalPremiumStatus()) {
        setPremiumStatus(true, false);
      } else {
        const sessionPremium = localStorage.getItem(PREMIUM_ACTIVE_KEY) === 'true';
        setPremiumStatus(sessionPremium, false);
      }
    }
  } catch (error) {
    console.error('Auth state handling error:', error);
  } finally {
    updateDashboardUi();
    state.isProcessingAuth = false;
  }
}

function initEventListeners() {
  elements.navBurger?.addEventListener('click', () => {
    const isOpen = elements.mobileMenu?.classList.contains('open');
    closeMobileMenu();
    if (!isOpen) {
      elements.mobileMenu?.classList.add('open');
      elements.navBurger?.classList.add('open');
    }
  });

  document.addEventListener('click', (event) => {
    if (!event.target.closest('.nav')) {
      closeMobileMenu();
    }
  });

  [elements.navLoginBtn, elements.mobileLoginBtn, elements.heroDemoBtn].forEach((button) => {
    button?.addEventListener('click', () => openModal(elements.accountModal));
  });
  [elements.navAccountBtn, elements.topbarAccountBtn, elements.heroStartBtn].forEach((button) => {
    button?.addEventListener('click', () => {
      document.getElementById('workspace')?.scrollIntoView({ behavior: 'smooth' });
      openModal(elements.accountModal);
    });
  });
  [...elements.openAccountBtns].forEach((button) => button.addEventListener('click', () => openModal(elements.accountModal)));
  [elements.navUpgradeBtn, elements.mobileUpgradeBtn, elements.topbarUpgradeBtn].forEach((button) => {
    button?.addEventListener('click', () => openModal(elements.purchaseModal));
  });
  [...elements.openUpgradeBtns].forEach((button) => button.addEventListener('click', () => openModal(elements.purchaseModal)));
  elements.accountOpenUpgrade?.addEventListener('click', () => {
    closeModal(elements.accountModal);
    openModal(elements.purchaseModal);
  });

  document.querySelectorAll('[data-close-modal]').forEach((button) => {
    button.addEventListener('click', () => {
      const targetId = button.getAttribute('data-close-modal');
      closeModal(document.getElementById(targetId));
    });
  });

  [elements.accountModal, elements.purchaseModal].forEach((modal) => {
    modal?.addEventListener('click', (event) => {
      if (event.target === modal) {
        closeModal(modal);
      }
    });
  });

  elements.sidebarToggle?.addEventListener('click', openSidebar);
  elements.sidebarOverlay?.addEventListener('click', closeSidebar);

  elements.authTabs.forEach((tab) => {
    tab.addEventListener('click', () => setAuthPanel(tab.dataset.authPanel));
  });

  elements.googleSigninBtn?.addEventListener('click', signInWithGoogleFlow);
  elements.signinSubmitBtn?.addEventListener('click', signInWithPasswordFlow);
  elements.signupSubmitBtn?.addEventListener('click', createAccountFlow);
  elements.magicSubmitBtn?.addEventListener('click', sendMagicLinkFlow);
  elements.forgotPasswordLink?.addEventListener('click', sendPasswordResetFlow);
  elements.accountLogoutBtn?.addEventListener('click', async () => {
    await signOut(state.auth);
    showToast('Signed out successfully.', 'success');
    closeModal(elements.accountModal);
  });
  elements.startCheckoutBtn?.addEventListener('click', startCheckout);
  elements.purchaseEmailInput?.addEventListener('input', (event) => {
    localStorage.setItem(PURCHASE_EMAIL_KEY, event.target.value.trim());
  });

  document.querySelectorAll('.faq-q').forEach((button) => {
    button.addEventListener('click', () => {
      const item = button.parentElement;
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item').forEach((faqItem) => faqItem.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeModal(elements.accountModal);
      closeModal(elements.purchaseModal);
      closeSidebar();
      closeMobileMenu();
    }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  initFirebase();
  applyConfigToUi();
  initEventListeners();
  await initGlobalConfigListener();
  handleRedirectStatus();
  await completeMagicLinkSignIn();
  onAuthStateChanged(state.auth, handleAuthStateChanged);
  updateDashboardUi();
});
