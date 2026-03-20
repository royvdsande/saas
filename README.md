# FitFlow SaaS Shell

Deze repo gebruikt nu de FitFlow-template UI als primaire interface, terwijl de bestaande Firebase auth-, Firestore- en Stripe-logica behouden blijft.

## Wat werkt nu
- Landing, pricing, auth en dashboard draaien in de FitFlow-stijl.
- Google login en email magic links gebruiken nog steeds Firebase Authentication.
- Stripe checkout blijft via Firestore `checkout_sessions` werken, inclusief anonieme fallback.
- Premium-status blijft gekoppeld aan `users`, `customers`, `payments` en `subscriptions`.
- De oude Binas viewer-specifieke UI is vervangen door een generieke SaaS shell.

## Belangrijke bestanden
- `index.html` – De nieuwe FitFlow single-page shell met landing, pricing, auth, dashboard en account-modal.
- `styles.css` – De FitFlow-styling plus extra states voor auth, account en modal-interacties.
- `script.js` – Firebase initialisatie, auth-flow, premium-sync, Stripe checkout en UI-state.
- `config.js` – Centrale config voor prijs, Firebase auth-domein en feature flags.
- `api/create-checkout-session.js` – Bestaande Vercel Stripe endpoint.
- `api/check-premium.js` – Bestaande Vercel endpoint om premium-status te valideren.

## Ontwikkelen
1. Start een lokale statische server of gebruik Vercel dev.
2. Zorg dat Firebase en Stripe environment variabelen beschikbaar zijn.
3. Test login, magic link, checkout en accountstatus vanuit de nieuwe FitFlow UI.
