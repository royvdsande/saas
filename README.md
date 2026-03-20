# Digitale Binas

Een statische pagina met een Mozilla PDF.js-viewer voor de Binas-tabellen, gecombineerd met een snelle inhoudsopgave aan de linkerzijde.

## Functionaliteit
- Mozilla's standaard PDF.js-viewer wordt ingeladen naast het linkermenu.
- Zoek door de inhoudsopgave om snel naar een tabel te springen; klikken opent direct de juiste pagina.
- Open de viewer in een nieuw tabblad via de knop rechtsboven.

## Projectstructuur
- `index.html` – Pagina-opbouw met zijbalk en ingesloten Mozilla PDF.js-viewer.
- `styles.css` – Opmaak, kleuren en lay-out van de viewer, navigatie en knoppen.
- `script.js` – Logica voor de navigatie, zoekfunctie, zijbalkbediening en het koppelen van de inhoudsopgave aan de PDF-viewer.
- `navigation-data.json` – Dataset voor de inhoudsopgave (secties, tabellen en subtabel-items).
- `favicon.png` – Favicon in de rootmap.
- `api/create-checkout-session.js` – Vercel serverless-functie om Stripe Checkout-sessies aan te maken (gebruikt `STRIPE_SECRET_KEY` en `STRIPE_PRICE_ID`).
- `api/check-premium.js` – Serverless-functie die premium-status rechtstreeks bij Stripe ophaalt aan de hand van e-mailadres en metadata.

## Gebruik
1. Open `index.html` in een moderne browser.
2. Klik op de gewenste tabel in de inhoudsopgave links om direct naar de juiste pagina in het PDF.js-venster te springen.
3. Gebruik desgewenst de knop **Open viewer in nieuw tabblad** om de PDF los te bekijken.

## Techniek
- [PDF.js](https://mozilla.github.io/pdf.js/) wordt via de officiële viewer-URL ingeladen in een iframe.
- De inhoudsopgave wordt asynchroon opgehaald uit `navigation-data.json` en geïntegreerd in de navigatieboom.
- Stripe Checkout en premium-validatie gebruiken Vercel serverless-functies; stel environment-variabelen `STRIPE_SECRET_KEY` en `STRIPE_PRICE_ID` (standaard `price_1SmVggLzjWXxGtsShYIXmRVx`) in. Publiceer nooit de secret key in de code.

## Ontwikkelen
- Pas de stijl aan in `styles.css`.
- Wijzig of breid de inhoud uit in `navigation-data.json`.
- De belangrijkste event-handling en renderlogica staat in `script.js`.
