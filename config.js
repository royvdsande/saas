// Binas App Configuration
// ========================
// Pas deze instellingen aan om de app te configureren.

const BINAS_CONFIG = {
  // Versie informatie
  version: "Versie 1.0.0",
  
  // Copyright tekst
  copyright: "2026 Binas.app",
  
  // Credit zichtbaarheid
  // true = "Gemaakt door Roy van der Sande" wordt getoond
  // false = Credit wordt verborgen
  showCredit: false,
  
  // Prijs configuratie
  // De prijs die wordt weergegeven voor Binas Plus
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
  // enableBinasPlus: true = Plus systeem actief (betalen voor extra functies)
  // enableBinasPlus: false = Iedereen heeft Plus functies, geen upsells, geen gold UI
  enableBinasPlus: false
};

// Export voor gebruik in andere scripts
if (typeof window !== 'undefined') {
  window.BINAS_CONFIG = BINAS_CONFIG;
}

export default BINAS_CONFIG;
