import { state } from "./state.js";
import { els } from "./elements.js";

export function closeMobileMenus() {
  document.querySelectorAll(".mobile-menu").forEach((menu) => menu.classList.remove("open"));
  document.querySelectorAll(".nav-burger").forEach((burger) => burger.classList.remove("open"));
}

export function openSidebar() {
  els.sidebarDash?.classList.add("open");
  els.overlayDash?.classList.add("open");
  document.body.style.overflow = "hidden";
}

export function closeSidebar() {
  els.sidebarDash?.classList.remove("open");
  els.overlayDash?.classList.remove("open");
  document.body.style.overflow = "";
  els.dashboardAccountMenu?.classList.remove("open");
}

export function openAccountModal() {
  els.accountModalShell.classList.remove("hidden");
  els.accountModalShell.setAttribute("aria-hidden", "false");
}

export function closeAccountModal() {
  els.accountModalShell.classList.add("hidden");
  els.accountModalShell.setAttribute("aria-hidden", "true");
}

export function toggleAccountMenu() {
  const wasOpen = els.dashboardAccountMenu.classList.contains("open");
  els.dashboardAccountMenu.classList.toggle("open", !wasOpen);
}

export function setSigninMode(mode) {
  state.signinMode = mode;
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
}
