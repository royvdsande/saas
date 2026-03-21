import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { initFirebase, state } from "/app/js/state.js";
import {
  completeMagicLinkSignIn,
  signInWithEmailPassword,
  signInWithGoogle,
  signUpWithEmailPassword,
  sendMagicLink,
  refreshAccountState,
} from "/app/js/auth.js";
import { els } from "/app/js/elements.js";
import { setSigninMode } from "/app/js/ui.js";

function bindPasswordToggles() {
  document.querySelectorAll(".toggle-password").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = btn.closest(".field-wrap")?.querySelector("input[type='password'], input[type='text']");
      if (!input) return;
      input.type = input.type === "password" ? "text" : "password";
    });
  });
}

function bindAuthEvents() {
  els.signinForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (state.signinMode === "magic") {
      await sendMagicLink(els.signinEmail.value.trim(), els.signinStatus, els.signinSubmit, "signin");
      return;
    }
    await signInWithEmailPassword(
      els.signinEmail.value.trim(),
      els.signinPassword?.value || "",
      els.signinStatus,
      els.signinSubmit
    );
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
    setSigninMode(state.signinMode === "password" ? "magic" : "password");
  });

  els.signinGoogle?.addEventListener("click", () => signInWithGoogle(els.signinStatus, els.signinGoogle));
  els.signupGoogle?.addEventListener("click", () => signInWithGoogle(els.signupStatus, els.signupGoogle));
}

async function init() {
  state.currentPageId = "page-auth";
  initFirebase();
  bindPasswordToggles();
  bindAuthEvents();
  await completeMagicLinkSignIn();
  onAuthStateChanged(state.auth, async (user) => {
    await refreshAccountState(user, {});
    if (user && !user.isAnonymous) {
      window.location.replace("/app/");
    }
  });
}

init();
