import { signOut } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { state } from "./state.js";
import { els } from "./elements.js";
import { setStatus, getFirebaseErrorMessage } from "./utils.js";
import { navigate, PAGE_PATHS } from "./router.js";
import {
  closeMobileMenus,
  openSidebar,
  closeSidebar,
  openAccountModal,
  closeAccountModal,
  toggleAccountMenu,
  setSigninMode,
} from "./ui.js";
import {
  sendMagicLink,
  signUpWithEmailPassword,
  signInWithEmailPassword,
  signInWithGoogle,
} from "./auth.js";
import { startCheckout, openBillingPortal } from "./billing.js";
import { showDashboardView, showSettingsTab, updateAccountSurfaces } from "./dashboard.js";
import {
  updateUserName,
  sendPasswordReset,
  setInitialPassword,
  deleteAccount,
  closeDeleteConfirmModal,
  performDeleteAccount,
  updateUserPassword,
} from "./settings.js";

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

export function bindEvents() {
  els.routeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.route;
      navigate(PAGE_PATHS[target] || "/" + target.replace("page-", ""));
    });
  });

  els.mobileMenuLinks.forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.route;
      navigate(PAGE_PATHS[target] || "/" + target.replace("page-", ""));
    });
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
    els.pricingToggleYearly?.classList.remove("active");
    state.currentBillingPeriod = "monthly";
    import("./dashboard.js").then(({ updatePricingCards }) => updatePricingCards());
  });
  els.pricingToggleYearly?.addEventListener("click", () => {
    els.pricingToggleMonthly?.classList.remove("active");
    els.pricingToggleYearly.classList.add("active");
    state.currentBillingPeriod = "yearly";
    import("./dashboard.js").then(({ updatePricingCards }) => updatePricingCards());
  });

  els.signinForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (state.signinMode === "magic") {
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
    setSigninMode(state.signinMode === "password" ? "magic" : "password");
  });

  // Dashboard view switching (scoped to sidebar)
  document.querySelectorAll("#sidebar-dash [data-dashboard-view]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const view = btn.dataset.dashboardView;
      const tab = btn.dataset.settingsTab;
      if (view === "settings") {
        navigate(`/app/settings${tab && tab !== "profile" ? `?tab=${tab}` : ""}`);
      } else if (view === "billing") {
        navigate("/app/billing");
      } else if (view === "ai") {
        navigate("/app/ai");
      } else if (view === "plan") {
        navigate("/app/plan");
      } else {
        navigate("/app/");
      }
    });
  });

  // Billing portal flow buttons (delegated)
  document.addEventListener("click", (e) => {
    const portalBtn = e.target.closest("[data-portal-flow]");
    if (portalBtn) {
      const flow = portalBtn.dataset.portalFlow;
      openBillingPortal(els.billingStatus, flow === "default" ? null : flow, portalBtn);
    }
  });

  // Plan checkout buttons (delegated)
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-plan-checkout]");
    if (btn) startCheckout(els.billingStatus, btn.dataset.planCheckout, btn);
    const pBtn = e.target.closest("[data-pricing-checkout]");
    if (pBtn) startCheckout(els.pricingStatus, pBtn.dataset.pricingCheckout, pBtn);
  });

  // Settings tabs
  document.querySelectorAll(".settings-tabs [data-settings-tab], #sidebar-settings [data-settings-tab]").forEach((btn) => {
    btn.addEventListener("click", () => showSettingsTab(btn.dataset.settingsTab));
  });

  // Profile: name
  els.settingsUpdateNameBtn?.addEventListener("click", () =>
    updateUserName(els.settingsNameInput?.value.trim(), els.settingsNameStatus, els.settingsUpdateNameBtn)
  );

  // Profile: delete account
  els.settingsDeleteAccountBtn?.addEventListener("click", () =>
    deleteAccount(els.settingsDeleteStatus)
  );

  // Delete confirm modal
  els.deleteConfirmCancelBtn?.addEventListener("click", closeDeleteConfirmModal);
  els.deleteConfirmBackdrop?.addEventListener("click", closeDeleteConfirmModal);
  els.deleteConfirmOkBtn?.addEventListener("click", performDeleteAccount);
  els.deleteConfirmInput?.addEventListener("input", () => {
    if (els.deleteConfirmOkBtn) {
      els.deleteConfirmOkBtn.disabled = els.deleteConfirmInput.value.toLowerCase() !== "delete";
    }
  });

  // Security: set password directly in UI
  els.settingsSetPasswordBtn?.addEventListener("click", () =>
    setInitialPassword(els.settingsSetPasswordInput?.value || "", els.settingsSecurityStatus, els.settingsSetPasswordBtn)
  );

  // Password strength icon — set password (no existing password)
  els.settingsSetPasswordInput?.addEventListener("input", () => {
    updatePasswordHint(els.settingsSetPasswordInput, document.getElementById("settings-set-password-hint"));
  });

  // Security: update password
  els.settingsUpdatePasswordBtn?.addEventListener("click", () =>
    updateUserPassword(
      els.settingsCurrentPassword?.value || "",
      els.settingsNewPassword?.value || "",
      els.settingsPasswordUpdateStatus,
      els.settingsUpdatePasswordBtn
    )
  );

  // Password strength icon — settings
  els.settingsNewPassword?.addEventListener("input", () => {
    updatePasswordHint(els.settingsNewPassword, document.getElementById("settings-password-hint"));
  });

  // Password strength icon — signup
  els.signupPassword?.addEventListener("input", () => {
    updatePasswordHint(els.signupPassword, document.getElementById("signup-password-hint"));
  });

  const eyeIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  const eyeOffIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

  // Password visibility toggles
  document.querySelectorAll(".toggle-password").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = btn.closest(".field-wrap")?.querySelector("input[type='password'], input[type='text']");
      if (!input) return;
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.innerHTML = show ? eyeOffIcon : eyeIcon;
    });
  });

  els.signinGoogle?.addEventListener("click", () => signInWithGoogle(els.signinStatus, els.signinGoogle));
  els.signupGoogle?.addEventListener("click", () => signInWithGoogle(els.signupStatus, els.signupGoogle));

  els.pricingCheckoutBtn?.addEventListener("click", () => startCheckout(els.pricingStatus));
  els.dashboardCheckoutCta?.addEventListener("click", () => startCheckout(els.dashboardStatus));
  els.modalCheckoutBtn?.addEventListener("click", () => startCheckout(els.modalStatus));

  [els.navOpenAccount, els.mobileOpenAccount, ...els.pricingAccountButtons].forEach((button) => {
    button?.addEventListener("click", openAccountModal);
  });

  els.modalDashboardBtn?.addEventListener("click", () => {
    closeAccountModal();
    navigate(state.currentUser ? "/app/" : "/auth/login.html");
  });

  els.modalLogoutBtn?.addEventListener("click", async () => {
    if (!state.auth || !state.auth.currentUser) return;
    await signOut(state.auth);
    closeAccountModal();
    window.location.replace("/");
  });

  els.accountModalBackdrop?.addEventListener("click", closeAccountModal);
  els.accountModalClose?.addEventListener("click", closeAccountModal);

  els.dashboardOpenSidebar?.addEventListener("click", openSidebar);
  els.overlayDash?.addEventListener("click", closeSidebar);
  els.dashboardUserTrigger?.addEventListener("click", toggleAccountMenu);
  els.dashboardSignout?.addEventListener("click", async () => {
    if (!state.auth || !state.auth.currentUser) return;
    await signOut(state.auth);
    window.location.replace("/");
  });

  els.ctxOpenHomepage?.addEventListener("click", () => {
    els.dashboardAccountMenu.classList.remove("open");
    window.location.href = "/";
  });

  els.tableCta?.addEventListener("click", () => { window.location.href = "/pricing"; });

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
