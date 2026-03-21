// Binas App Configuration
// ========================

const BINAS_CONFIG = {
  version: "Versie 1.0.0",
  copyright: "2026 Binas.app",
  showCredit: false,

  // Firebase configuratie
  authDomain: "account.binas.app",

  // Admin configuratie
  primaryAdmin: "mail@royvds.nl",

  // Feature Flags
  enableBinasPlus: true,

  // Fallback Stripe Price ID (Plus maandelijks)
  stripePriceId: "price_1TDM6gLzjWXxGtsSmBBGHvnY",

  // Abonnementen
  plans: [
    {
      id: "plus",
      name: "Plus",
      desc: "Ideaal om te starten.",
      monthlyPrice: "4,99",
      yearlyPrice: "3,99",
      yearlyTotal: "47,99",
      monthlyPriceId: "price_1TDM6gLzjWXxGtsSmBBGHvnY",
      yearlyPriceId: "price_1TDMJ5LzjWXxGtsSYaGkzu7c",
      popular: false,
      features: [
        "Alles in Free",
        "E-mail + wachtwoord login",
        "Magic link inloggen",
        "Basis account dashboard",
        "E-mail support",
      ],
    },
    {
      id: "pro",
      name: "Pro",
      desc: "Voor serieuze projecten.",
      monthlyPrice: "9,00",
      yearlyPrice: "7,20",
      yearlyTotal: "86,40",
      monthlyPriceId: "price_1TDM7zLzjWXxGtsSSjb4tnbS",
      yearlyPriceId: "price_1TDMLbLzjWXxGtsS87kmPljA",
      popular: true,
      features: [
        "Alles in Plus",
        "Prioriteit support",
        "Geavanceerde analytics",
        "Stripe billing portal",
        "Custom integraties",
      ],
    },
    {
      id: "ultimate",
      name: "Ultimate",
      desc: "Onbeperkt schalen.",
      monthlyPrice: "49,99",
      yearlyPrice: "39,99",
      yearlyTotal: "479,88",
      monthlyPriceId: "price_1TDM8YLzjWXxGtsSOlI0joem",
      yearlyPriceId: "price_1TDMMiLzjWXxGtsSOjYwRXfP",
      popular: false,
      features: [
        "Alles in Pro",
        "API toegang",
        "Onbeperkte teamleden",
        "SLA garantie",
        "Dedicated support",
      ],
    },
  ],
};

if (typeof window !== "undefined") {
  window.BINAS_CONFIG = BINAS_CONFIG;
}

export default BINAS_CONFIG;
