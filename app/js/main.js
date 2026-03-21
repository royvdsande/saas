import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { state, plusLocalKey, initFirebase } from "./state.js";
import { els } from "./elements.js";
import { setStatus } from "./utils.js";
import { navigate, renderRoute } from "./router.js";
import { refreshAccountState, completeMagicLinkSignIn } from "./auth.js";
import { updatePricingCopy, updateAccountSurfaces } from "./dashboard.js";
import { bindEvents } from "./events.js";

let _routeInitialized = false;

async function initAuth() {
  initFirebase();
  await completeMagicLinkSignIn();

  window.addEventListener("popstate", () => renderRoute());

  onAuthStateChanged(state.auth, async (user) => {
    await refreshAccountState(user, {});

    if (!_routeInitialized) {
      _routeInitialized = true;
      renderRoute();
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      if (params.get("anonymous") === "true") {
        localStorage.setItem(plusLocalKey, "true");
      }
      state.isPremiumUser = true;
      state.currentPlanLabel = "Premium";
      setStatus(
        els.dashboardStatus,
        "Checkout voltooid. Je premium-status wordt gesynchroniseerd.",
        "success"
      );
      window.history.replaceState({}, document.title, window.location.pathname);
      await refreshAccountState(user);
    }

    if (params.get("checkout") === "cancel") {
      setStatus(els.dashboardStatus, "Checkout geannuleerd.", "info");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  });
}

function init() {
  state.currentPageId = "page-dashboard";
  updatePricingCopy();
  bindEvents();
  updateAccountSurfaces();
  initAuth();
}

init();
