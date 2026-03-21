export function setStatus(element, message, variant = "info") {
  if (!element) return;
  if (!message) {
    element.hidden = true;
    element.textContent = "";
    element.dataset.variant = "";
    return;
  }
  element.hidden = false;
  element.dataset.variant = variant;
  element.textContent = message;
}

export function setLoadingState(button, isLoading) {
  if (!button) return;
  if (isLoading) {
    if (!button.dataset.originalLabel) {
      button.dataset.originalLabel = button.innerHTML;
    }
    button.disabled = true;
    button.innerHTML = '<span class="btn-dots"><span></span><span></span><span></span></span>';
  } else {
    button.disabled = false;
    if (button.dataset.originalLabel) {
      button.innerHTML = button.dataset.originalLabel;
      delete button.dataset.originalLabel;
    }
  }
}

export function getInitials(user) {
  const base = user?.displayName || user?.email || "A";
  return base.trim().charAt(0).toUpperCase();
}

export function getAvatarMarkup(user) {
  if (user?.photoURL) {
    return `<img src="${user.photoURL}" alt="Profielfoto" referrerpolicy="no-referrer" />`;
  }
  return getInitials(user);
}

export function formatDate(value) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value.toDate?.() || value;
  if (Number.isNaN(date?.getTime?.())) return "—";
  return new Intl.DateTimeFormat("nl-NL", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function getProviderLabel(user) {
  const providerId = user?.providerData?.[0]?.providerId || user?.providerId;
  if (providerId === "google.com") return "Google";
  if (providerId === "password") return "Email";
  if (providerId === "emailLink") return "Email";
  return providerId ? providerId.replace(".com", "") : "Email";
}

export function getProviderDescription(user) {
  const providerId = user?.providerData?.[0]?.providerId;
  if (providerId === "google.com") return "Ingelogd via Google";
  if (providerId === "emailLink") return "Ingelogd via magic link";
  if (providerId === "password") return "Ingelogd via wachtwoord";
  return "Email login";
}

export function getFirebaseErrorMessage(code) {
  const messages = {
    "auth/email-already-in-use": "Dit e-mailadres is al in gebruik. Probeer in te loggen.",
    "auth/invalid-email": "Ongeldig e-mailadres. Controleer je invoer.",
    "auth/weak-password": "Wachtwoord is te zwak. Gebruik minimaal 6 tekens.",
    "auth/user-not-found": "Geen account gevonden met dit e-mailadres.",
    "auth/wrong-password": "Onjuist wachtwoord. Probeer het opnieuw.",
    "auth/invalid-credential": "Onjuiste inloggegevens. Controleer je e-mail en wachtwoord.",
    "auth/too-many-requests": "Te veel pogingen. Wacht even en probeer opnieuw.",
    "auth/user-disabled": "Dit account is uitgeschakeld. Neem contact op met support.",
    "auth/network-request-failed": "Netwerkfout. Controleer je internetverbinding.",
    "auth/popup-closed-by-user": null,
    "auth/cancelled-popup-request": null,
    "auth/popup-blocked": "Popup geblokkeerd. Sta popups toe voor deze site.",
    "auth/requires-recent-login": "Log opnieuw in om deze actie uit te voeren.",
    "auth/multi-factor-auth-required": null,
  };
  if (code in messages) return messages[code];
  return "Er is iets misgegaan. Probeer het opnieuw.";
}
