// SaaS App Configuration
// ========================
// Pas deze instellingen aan om de app te configureren.

const APP_CONFIG = {
  // Versie informatie
  version: "Versie 1.0.0",
  
  // Copyright tekst
  copyright: "© 2026 SaaS App",
  
  // Credit zichtbaarheid
  // true = "Gemaakt door Roy van der Sande" wordt getoond
  // false = Credit wordt verborgen
  showCredit: false,
  
  // Prijs configuratie
  // De prijs die wordt weergegeven voor Premium
  priceDisplay: "1,49",
  
  // Sale configuratie
  // Originele prijs (doorgestreept) en kortingspercentage
  originalPrice: "2,99",
  discountPercentage: "50",
  
  // Stripe Price ID voor betalingen
  // Dit is het ID van het product in Stripe
  stripePriceId: "price_1SmVggLzjWXxGtsShYIXmRVx",

  // Firebase configuratie
  // Custom auth domein voor Firebase hosting en login
  authDomain: "account.binas.app",
  
  // Admin configuratie
  // Email adressen die toegang hebben tot het admin panel
  primaryAdmin: "mail@royvds.nl",
// Global Feature Flags
  // enableBinasPlus: true = premium systeem actief (betalen voor extra functies)
  // enableBinasPlus: false = iedereen heeft premium functies, geen upsells
  enableBinasPlus: false
};

// Export voor gebruik in andere scripts
if (typeof window !== 'undefined') {
  window.APP_CONFIG = APP_CONFIG;
  window.BINAS_CONFIG = APP_CONFIG;
}

export default APP_CONFIG;
