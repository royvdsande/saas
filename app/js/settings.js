import {
  updateProfile,
  updateEmail,
  sendPasswordResetEmail,
  deleteUser,
  GoogleAuthProvider,
  linkWithPopup,
  unlink,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { state } from "./state.js";
import { els } from "./elements.js";
import { setStatus, setLoadingState, getFirebaseErrorMessage } from "./utils.js";
import { navigate } from "./router.js";
import { updateAccountSurfaces, updateSecurityTab } from "./dashboard.js";

export async function updateUserName(name, statusEl, button) {
  if (!name) { setStatus(statusEl, "Vul je naam in.", "error"); return; }
  if (!state.currentUser) { setStatus(statusEl, "Niet ingelogd.", "error"); return; }
  setLoadingState(button, true, "Opslaan...");
  setStatus(statusEl, "", "info");
  try {
    await updateProfile(state.currentUser, { displayName: name });
    updateAccountSurfaces();
    setStatus(statusEl, "Naam succesvol bijgewerkt.", "success");
  } catch (error) {
    setStatus(statusEl, getFirebaseErrorMessage(error.code), "error");
  } finally {
    setLoadingState(button, false);
  }
}

export async function updateUserEmailAddr(newEmail, statusEl, button) {
  if (!newEmail) { setStatus(statusEl, "Vul een nieuw e-mailadres in.", "error"); return; }
  if (!state.currentUser) { setStatus(statusEl, "Niet ingelogd.", "error"); return; }
  setLoadingState(button, true, "Bijwerken...");
  setStatus(statusEl, "", "info");
  try {
    await updateEmail(state.currentUser, newEmail);
    if (els.settingsCurrentEmail) els.settingsCurrentEmail.value = newEmail;
    if (els.settingsNewEmailInput) els.settingsNewEmailInput.value = "";
    setStatus(statusEl, "E-mailadres bijgewerkt. Controleer je inbox voor verificatie.", "success");
    updateAccountSurfaces();
  } catch (error) {
    const msg =
      error.code === "auth/requires-recent-login"
        ? "Log opnieuw in om je e-mail te wijzigen. Uitloggen en opnieuw inloggen is vereist."
        : getFirebaseErrorMessage(error.code);
    setStatus(statusEl, msg, "error");
  } finally {
    setLoadingState(button, false);
  }
}

export async function sendPasswordReset(statusEl, button) {
  if (!state.currentUser?.email) { setStatus(statusEl, "Geen e-mailadres gevonden.", "error"); return; }
  setLoadingState(button, true, "Versturen...");
  setStatus(statusEl, "", "info");
  try {
    await sendPasswordResetEmail(state.auth, state.currentUser.email);
    setStatus(statusEl, `Wachtwoord reset-e-mail verstuurd naar ${state.currentUser.email}.`, "success");
  } catch (error) {
    setStatus(statusEl, getFirebaseErrorMessage(error.code), "error");
  } finally {
    setLoadingState(button, false);
  }
}

export async function removeProfilePhoto(statusEl, button) {
  if (!state.currentUser) return;
  setLoadingState(button, true, "Verwijderen...");
  try {
    await updateProfile(state.currentUser, { photoURL: null });
    updateAccountSurfaces();
    setStatus(statusEl, "Profielfoto verwijderd.", "success");
  } catch (error) {
    setStatus(statusEl, getFirebaseErrorMessage(error.code), "error");
  } finally {
    setLoadingState(button, false);
  }
}

export async function deleteAccount(statusEl, button) {
  if (!state.currentUser) return;
  const confirmed = window.confirm(
    "Weet je zeker dat je je account wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt."
  );
  if (!confirmed) return;
  setLoadingState(button, true, "Verwijderen...");
  setStatus(statusEl, "", "info");
  try {
    await deleteUser(state.currentUser);
    window.location.replace("/");
  } catch (error) {
    const msg =
      error.code === "auth/requires-recent-login"
        ? "Log opnieuw in om je account te verwijderen."
        : getFirebaseErrorMessage(error.code);
    setStatus(statusEl, msg, "error");
    setLoadingState(button, false);
  }
}

export async function toggleGoogleLink(statusEl, button) {
  if (!state.currentUser) return;
  const isLinked = button.dataset.linked === "true";
  setLoadingState(button, true, isLinked ? "Ontkoppelen..." : "Verbinden...");
  setStatus(statusEl, "", "info");
  try {
    if (isLinked) {
      await unlink(state.currentUser, "google.com");
      setStatus(statusEl, "Google account ontkoppeld.", "success");
    } else {
      const provider = new GoogleAuthProvider();
      await linkWithPopup(state.currentUser, provider);
      setStatus(statusEl, "Google account gekoppeld.", "success");
    }
    updateSecurityTab();
  } catch (error) {
    const msg = getFirebaseErrorMessage(error.code);
    if (msg) setStatus(statusEl, msg, "error");
  } finally {
    setLoadingState(button, false);
  }
}
