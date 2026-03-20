const SAAS_CONFIG = {
  version: 'Version 2.0.0',
  appName: 'FitFlow SaaS',
  appTagline: 'Launch your SaaS with production-ready auth, billing, and account management.',
  copyright: '© 2026 FitFlow SaaS',
  showCredit: false,
  priceDisplay: '1,49',
  originalPrice: '2,99',
  discountPercentage: '50',
  stripePriceId: 'price_1SmVggLzjWXxGtsShYIXmRVx',
  authDomain: 'account.binas.app',
  primaryAdmin: 'mail@royvds.nl',
  enablePremium: false,
};

if (typeof window !== 'undefined') {
  window.SAAS_CONFIG = SAAS_CONFIG;
}

export default SAAS_CONFIG;
