import {
  isSignInWithEmailLink,
  signInWithEmailLink,
  sendSignInLinkToEmail,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  getMultiFactorResolver,
  TotpMultiFactorGenerator,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { state, plusLocalKey, storedEmailKey, initFirebase } from "./state.js";
import { els } from "./elements.js";
import { setStatus, setLoadingState, getFirebaseErrorMessage } from "./utils.js";
import { navigate } from "./router.js";
import { hasLocalPlusStatus, savePlusStatusToCloud, checkCloudPlusStatus, getDashboardContext } from "./premium.js";
import { updateAccountSurfaces } from "./dashboard.js";

// MFA state
let _mfaResolver = null;

function showMfaChallenge() {
  const authCard = document.querySelector(".auth-card:not(#mfa-challenge)");
  const mfaCard = document.getElementById("mfa-challenge");
  if (authCard) authCard.classList.add("hidden");
  if (mfaCard) mfaCard.classList.remove("hidden");
}

export function cancelMfaChallenge() {
  _mfaResolver = null;
  const authCard = document.querySelector(".auth-card:not(#mfa-challenge)");
  const mfaCard = document.getElementById("mfa-challenge");
  if (mfaCard) mfaCard.classList.add("hidden");
  if (authCard) authCard.classList.remove("hidden");
}

export async function verifyMfaCode(code, statusEl, button) {
  if (!_mfaResolver) return;
  if (!code || code.length !== 6) {
    setStatus(statusEl, "Voer een 6-cijferige code in.", "error");
    return;
  }
  setLoadingState(button, true, "Verifiëren...");
  setStatus(statusEl, "", "info");
  try {
    const totpHint = _mfaResolver.hints.find(
      (h) => h.factorId === TotpMultiFactorGenerator.FACTOR_ID
    );
    if (!totpHint) {
      setStatus(statusEl, "Geen TOTP-factor gevonden.", "error");
      return;
    }
    const assertion = TotpMultiFactorGenerator.assertionForSignIn(
      totpHint.uid,
      code
    );
    const result = await _mfaResolver.resolveSignIn(assertion);
    state.currentUser = result.user;
    _mfaResolver = null;
    navigate("/app/");
  } catch (error) {
    setStatus(statusEl, "Ongeldige of verlopen code. Probeer opnieuw.", "error");
  } finally {
    setLoadingState(button, false);
  }
}

export async function sendMagicLink(email, statusEl, submitButton, mode = "signin") {
  if (!email) {
    setStatus(statusEl, "Vul een geldig e-mailadres in.", "error");
    return;
  }

  initFirebase();
  setLoadingState(submitButton, true, "Versturen...");
  setStatus(statusEl, "", "info");

  try {
    await sendSignInLinkToEmail(state.auth, email, {
      url: `${window.location.origin}/auth/login.html`,
      handleCodeInApp: true,
    });
    localStorage.setItem(storedEmailKey, email);
    const message =
      mode === "signup"
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

export async function signUpWithEmailPassword(name, email, password, statusEl, button) {
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
    const result = await createUserWithEmailAndPassword(state.auth, email, password);
    await updateProfile(result.user, { displayName: name });
    await sendEmailVerification(result.user);
    state.currentUser = result.user;
    setStatus(
      els.dashboardStatus,
      "Welkom! We hebben een verificatie-e-mail verstuurd. Controleer je inbox.",
      "info"
    );
    navigate("/app/");
  } catch (error) {
    const msg = getFirebaseErrorMessage(error.code);
    setStatus(statusEl, msg, "error");
  } finally {
    setLoadingState(button, false);
  }
}

export async function signInWithEmailPassword(email, password, statusEl, button) {
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
    const result = await signInWithEmailAndPassword(state.auth, email, password);
    state.currentUser = result.user;
    navigate("/app/");
  } catch (error) {
    if (error.code === "auth/multi-factor-auth-required") {
      _mfaResolver = getMultiFactorResolver(state.auth, error);
      showMfaChallenge();
    } else {
      const msg = getFirebaseErrorMessage(error.code);
      setStatus(statusEl, msg, "error");
    }
  } finally {
    setLoadingState(button, false);
  }
}

export async function signInWithGoogle(statusEl, button) {
  initFirebase();
  setLoadingState(button, true, "Google openen...");
  setStatus(statusEl, "", "info");

  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(state.auth, provider);
    state.currentUser = result.user;
    navigate("/app/");
  } catch (error) {
    if (error.code === "auth/multi-factor-auth-required") {
      _mfaResolver = getMultiFactorResolver(state.auth, error);
      showMfaChallenge();
    } else {
      const msg = getFirebaseErrorMessage(error.code);
      if (msg) {
        setStatus(statusEl, msg, "error");
      }
    }
  } finally {
    setLoadingState(button, false);
  }
}

export async function completeMagicLinkSignIn() {
  initFirebase();
  if (!isSignInWithEmailLink(state.auth, window.location.href)) {
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
    const result = await signInWithEmailLink(state.auth, email, window.location.href);
    state.currentUser = result.user;
    localStorage.removeItem(storedEmailKey);
    window.history.replaceState({}, document.title, window.location.pathname);
    navigate("/app/");
  } catch (error) {
    const msg = getFirebaseErrorMessage(error.code);
    setStatus(els.signinStatus, msg || "Magic link login mislukt.", "error");
    window.location.replace("/auth/login.html");
  }
}

export async function refreshAccountState(user, options = {}) {
  state.currentUser = user && !user.isAnonymous ? user : null;

  if (!state.currentUser) {
    state.dashboardContext = null;
    state.isPremiumUser = hasLocalPlusStatus();
    state.currentPlanLabel = state.isPremiumUser ? "Premium" : "Free";
    updateAccountSurfaces();
    if (window.location.pathname.startsWith("/app")) {
      window.location.replace("/auth/login.html");
    }
    return;
  }

  const hasCloudPlus = await checkCloudPlusStatus(state.currentUser);
  if (!hasCloudPlus && hasLocalPlusStatus()) {
    await savePlusStatusToCloud(state.currentUser);
  }

  state.isPremiumUser = hasCloudPlus || hasLocalPlusStatus();
  state.currentPlanLabel = state.isPremiumUser ? "Premium" : "Free";
  state.dashboardContext = await getDashboardContext(state.currentUser);
  updateAccountSurfaces();

  if (options.showDashboard) {
    navigate("/app/");
  }
}
