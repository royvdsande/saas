import { state } from "./state.js";
import { els } from "./elements.js";
import { closeMobileMenus, closeSidebar, closeAccountModal } from "./ui.js";

// ── Progress bar ──────────────────────────────────────────────────────────────
let _progressTimer = null;
const _progressEl = document.getElementById("progress-bar");

export function startProgress() {
  if (!_progressEl) return;
  clearTimeout(_progressTimer);
  _progressEl.classList.remove("finishing");
  _progressEl.style.width = "0%";
  _progressEl.classList.add("running");
  requestAnimationFrame(() => requestAnimationFrame(() => { _progressEl.style.width = "72%"; }));
}

export function finishProgress() {
  if (!_progressEl) return;
  _progressEl.classList.add("finishing");
  _progressTimer = setTimeout(() => {
    _progressEl.classList.remove("running", "finishing");
    _progressEl.style.width = "0%";
  }, 400);
}

// ── URL routing ───────────────────────────────────────────────────────────────
export const PAGE_PATHS = {
  "page-landing": "/",
  "page-pricing": "/pricing",
  "page-signin": "/signin",
  "page-signup": "/signup",
  "page-dashboard": "/dashboard",
};

export function navigate(path, { showProgress = true } = {}) {
  const current = window.location.pathname + window.location.search;
  if (current === path) return;
  if (showProgress) startProgress();
  window.history.pushState({}, "", path);
  renderRoute();
  if (showProgress) setTimeout(finishProgress, 80);
}

export function renderRoute() {
  const path = window.location.pathname;
  const tab = new URLSearchParams(window.location.search).get("tab");

  // Import dashboard lazily to avoid circular dependency at module init time
  import("./dashboard.js").then(({ showDashboardView }) => {
    if (path === "/dashboard/settings") {
      if (!state.currentUser) { navigate("/signin", { showProgress: false }); return; }
      _showPageDirect("page-dashboard");
      showDashboardView("settings", tab || "profile");
      return;
    }
    if (path === "/dashboard/billing") {
      if (!state.currentUser) { navigate("/signin", { showProgress: false }); return; }
      _showPageDirect("page-dashboard");
      showDashboardView("billing");
      return;
    }
    if (path === "/dashboard") {
      if (!state.currentUser) { navigate("/signin", { showProgress: false }); return; }
      _showPageDirect("page-dashboard");
      showDashboardView("overview");
      return;
    }
    const pageMap = {
      "/": "page-landing",
      "/pricing": "page-pricing",
      "/signin": "page-signin",
      "/signup": "page-signup",
    };
    _showPageDirect(pageMap[path] || "page-landing");
  });
}

export function _showPageDirect(id) {
  if ((id === "page-dashboard") && !state.currentUser) {
    navigate("/signin", { showProgress: false }); return;
  }
  state.currentPageId = id;
  els.pages.forEach((p) => p.classList.toggle("active", p.id === id));
  closeMobileMenus();
  closeSidebar();
  closeAccountModal();
  window.scrollTo(0, 0);
}

export function showPage(id) {
  const path = PAGE_PATHS[id] || "/";
  navigate(path);
}
