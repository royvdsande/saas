# SaaS App Boilerplate

Een generieke SaaS-starter met een dashboard-shell, landingspagina met Firebase-authenticatie, premium billing via Stripe en een behouden admin-paneel.

## Functionaliteit
- Generieke dashboard-layout met zijbalk, topbar en placeholder-content voor nieuwe widgets.
- Homepage met Google-login en e-mail magic link via Firebase Authentication.
- Premium-statuscontrole en Stripe Checkout via bestaande Vercel serverless-functies.
- Behouden admin-paneel voor configuratie, premium-toegang en gebruikersbeheer.

## Projectstructuur
- `index.html` – Dashboard-shell voor de applicatie.
- `styles.css` – Dashboard-opmaak en modal/billing-layout.
- `home.html` – Marketing-homepage met geïntegreerde login.
- `home.js` – Auth-logica voor de homepage.
- `pricing.html` – Generieke pricing-pagina voor premium toegang.
- `marketing.css` – Gedeelde styling voor marketing-, pricing- en legal-pagina's.
- `admin.html` – Behouden admin-paneel en beheertools.
- `config.js` – Runtime configuratie voor versie, pricing en auth-domein.
- `api/create-checkout-session.js` – Vercel serverless-functie om Stripe Checkout-sessies aan te maken.
- `api/check-premium.js` – Serverless-functie die premium-status rechtstreeks bij Stripe ophaalt.

## Ontwikkelen
- Pas dashboardblokken en componenten aan in `index.html` en `styles.css`.
- Werk de homepage-auth-flow bij in `home.js` als je onboarding of redirects wilt aanpassen.
- Laat de Stripe- en Firebase-gebaseerde backend-routes intact tenzij je bewust de infrastructuur migreert.
