import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { initFirebase, state } from "/app/js/state.js";

function closeMobileMenus() {
  document.querySelectorAll(".mobile-menu").forEach((menu) => menu.classList.remove("open"));
  document.querySelectorAll(".nav-burger").forEach((burger) => burger.classList.remove("open"));
}

function updateAuthNavigation() {
  document.querySelectorAll(".nav-auth-logged-out").forEach((node) => {
    node.classList.toggle("hidden", Boolean(state.currentUser));
  });
  document.querySelectorAll(".nav-auth-logged-in").forEach((node) => {
    node.classList.toggle("hidden", !state.currentUser);
  });
}

function bindShellEvents() {
  document.querySelectorAll(".nav-burger").forEach((button) => {
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

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".nav") && !event.target.closest(".mobile-menu")) {
      closeMobileMenus();
    }
  });
}

state.currentPageId = "page-public";
initFirebase();
bindShellEvents();

onAuthStateChanged(state.auth, (user) => {
  state.currentUser = user && !user.isAnonymous ? user : null;
  updateAuthNavigation();
});
