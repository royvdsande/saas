// FitFlow App Configuration
// ========================

const BINAS_CONFIG = {
  version: "Versie 2.0.0",
  copyright: "2026 FitFlow",
  showCredit: false,

  // Firebase configuratie
  authDomain: "account.binas.app",

  // Admin configuratie
  primaryAdmin: "mail@royvds.nl",

  // Feature Flags
  enableBinasPlus: true,

  // Fallback Stripe Price ID (Starter monthly)
  stripePriceId: "price_1TDM6gLzjWXxGtsSmBBGHvnY",

  // Credit Packages (one-time purchases — replace placeholder priceIds when ready)
  creditPackages: [
    {
      id: "credits_starter",
      label: "Starter",
      desc: "Great for trying out AI features",
      credits: 10000,
      bonus: 0,
      price: "9,99",
      priceId: "price_PLACEHOLDER_STARTER",
      popular: false,
    },
    {
      id: "credits_basic",
      label: "Basic",
      desc: "For regular AI usage",
      credits: 50000,
      bonus: 5000,
      price: "39,99",
      priceId: "price_PLACEHOLDER_BASIC",
      popular: true,
    },
    {
      id: "credits_pro",
      label: "Pro",
      desc: "Best value for power users",
      credits: 200000,
      bonus: 40000,
      price: "149,99",
      priceId: "price_PLACEHOLDER_PRO",
      popular: false,
    },
  ],

  // Subscription Plans
  plans: [
    {
      id: "plus",
      name: "Starter",
      desc: "Perfect to get started with AI fitness.",
      monthlyPrice: "4,99",
      yearlyPrice: "3,99",
      yearlyTotal: "47,99",
      monthlyPriceId: "price_1TDM6gLzjWXxGtsSmBBGHvnY",
      yearlyPriceId: "price_1TDMJ5LzjWXxGtsSYaGkzu7c",
      popular: false,
      monthlyCredits: 5000,
      features: [
        "1 AI-generated plan per month",
        "7-day training schedule",
        "Basic nutrition guide",
        "Email support",
      ],
    },
    {
      id: "pro",
      name: "Pro",
      desc: "For serious athletes who want results.",
      monthlyPrice: "9,00",
      yearlyPrice: "7,20",
      yearlyTotal: "86,40",
      monthlyPriceId: "price_1TDM7zLzjWXxGtsSSjb4tnbS",
      yearlyPriceId: "price_1TDMLbLzjWXxGtsS87kmPljA",
      popular: true,
      monthlyCredits: 15000,
      features: [
        "Unlimited AI plans",
        "Weekly plan updates",
        "Detailed macro tracking",
        "Priority support",
      ],
    },
    {
      id: "ultimate",
      name: "Elite",
      desc: "The ultimate fitness experience.",
      monthlyPrice: "49,99",
      yearlyPrice: "39,99",
      yearlyTotal: "479,88",
      monthlyPriceId: "price_1TDM8YLzjWXxGtsSOlI0joem",
      yearlyPriceId: "price_1TDMMiLzjWXxGtsSOjYwRXfP",
      popular: false,
      monthlyCredits: 50000,
      features: [
        "Everything in Pro",
        "AI coaching chat",
        "Custom meal preferences",
        "Dedicated support",
      ],
    },
  ],
};

if (typeof window !== "undefined") {
  window.BINAS_CONFIG = BINAS_CONFIG;
}

export default BINAS_CONFIG;
