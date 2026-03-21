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

function updatePasswordHint(input, hintEl) {
  if (!hintEl) return;
  const len = input.value.length;
  const xIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
  const checkIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
  if (len === 0) {
    hintEl.innerHTML = `${xIcon} 6 or more characters`;
    hintEl.style.color = "var(--gray-400, #9ca3af)";
  } else if (len < 6) {
    hintEl.innerHTML = `${xIcon} 6 or more characters`;
    hintEl.style.color = "#dc2626";
  } else {
    hintEl.innerHTML = `${checkIcon} Looks good`;
    hintEl.style.color = "#16a34a";
  }
}

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

  // Password strength hint on signup page
  els.signupPassword?.addEventListener("input", () => {
    updatePasswordHint(els.signupPassword, document.getElementById("signup-password-hint"));
  });
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
      // After signup → onboarding; after login → dashboard
      const isSignup = window.location.pathname.includes("signup");
      window.location.replace(isSignup ? "/onboarding" : "/app/");
    }
  });
}

init();
