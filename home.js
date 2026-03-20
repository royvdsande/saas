import {
  initializeApp,
  getApps,
  getApp,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import {
  getAuth,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
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

const emailInput = document.getElementById('email-input');
const emailLoginButton = document.getElementById('email-login-btn');
const googleLoginButton = document.getElementById('btn-login-google');
const logoutButton = document.getElementById('logout-btn');
const authStatus = document.getElementById('auth-status');
const footerCopyright = document.getElementById('footer-copyright');

let firebaseApp;
let auth;

function initFirebase() {
  if (!firebaseApp) {
    firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
  }

  if (!auth) {
    auth = getAuth(firebaseApp);
    auth.languageCode = 'nl';
  }
}

function setStatus(message, variant = 'neutral') {
  authStatus.textContent = message;
  authStatus.dataset.variant = variant;
}

async function completeEmailLinkSignIn() {
  if (!isSignInWithEmailLink(auth, window.location.href)) {
    return;
  }

  const email = window.localStorage.getItem('emailForSignIn');
  if (!email) {
    setStatus('Open the sign-in link from the same browser where you requested it.', 'error');
    return;
  }

  try {
    await signInWithEmailLink(auth, email, window.location.href);
    window.localStorage.removeItem('emailForSignIn');
    window.history.replaceState({}, document.title, window.location.pathname);
    setStatus('Your email sign-in is complete. You can open the dashboard now.', 'success');
  } catch (error) {
    console.error('Email sign-in failed:', error);
    setStatus('The sign-in link could not be verified.', 'error');
  }
}

async function handleEmailLinkRequest() {
  const email = emailInput.value.trim();
  if (!email) {
    setStatus('Enter an email address first.', 'error');
    return;
  }

  emailLoginButton.disabled = true;
  try {
    await sendSignInLinkToEmail(auth, email, {
      url: `${window.location.origin}/home`,
      handleCodeInApp: true,
    });
    window.localStorage.setItem('emailForSignIn', email);
    setStatus('Magic link sent. Check your inbox to continue.', 'success');
  } catch (error) {
    console.error('Magic link error:', error);
    setStatus(error.message || 'Unable to send sign-in link.', 'error');
  } finally {
    emailLoginButton.disabled = false;
  }
}

async function handleGoogleLogin() {
  googleLoginButton.disabled = true;
  try {
    await signInWithPopup(auth, new GoogleAuthProvider());
    setStatus('Signed in successfully. You can open the dashboard now.', 'success');
  } catch (error) {
    console.error('Google sign-in failed:', error);
    setStatus(error.message || 'Google sign-in failed.', 'error');
  } finally {
    googleLoginButton.disabled = false;
  }
}

function applyFooterCopy() {
  footerCopyright.textContent = APP_CONFIG?.copyright || '© 2026 SaaS App';
}

function registerEventListeners() {
  emailLoginButton.addEventListener('click', handleEmailLinkRequest);
  googleLoginButton.addEventListener('click', handleGoogleLogin);
  logoutButton.addEventListener('click', async () => {
    await signOut(auth);
  });
}

function listenForAuthChanges() {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      setStatus(`Signed in as ${user.email || user.displayName || 'your account'}.`, 'success');
      logoutButton.hidden = false;
    } else {
      setStatus('Not signed in.', 'neutral');
      logoutButton.hidden = true;
    }
  });
}

async function init() {
  initFirebase();
  applyFooterCopy();
  registerEventListeners();
  await completeEmailLinkSignIn();
  listenForAuthChanges();
}

init();
