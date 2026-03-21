const Stripe = require('stripe');
const admin = require('firebase-admin');

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

function getFirebase() {
  if (!admin.apps.length) {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (serviceAccount) {
      admin.initializeApp({ credential: admin.credential.cert(JSON.parse(serviceAccount)) });
    } else {
      admin.initializeApp({ credential: admin.credential.applicationDefault() });
    }
  }
  return { auth: admin.auth(), db: admin.firestore() };
}

async function authenticate(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    throw new Error('Geen geldige auth token gevonden. Log opnieuw in.');
  }
  const idToken = authHeader.replace('Bearer ', '').trim();
  const { auth } = getFirebase();
  return auth.verifyIdToken(idToken);
}

function respond(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return respond(res, 405, { message: 'Method Not Allowed' });
  }

  if (!stripeSecretKey) {
    return respond(res, 500, { message: 'Stripe secret key ontbreekt in de configuratie.' });
  }

  let decodedToken;
  try {
    decodedToken = await authenticate(req);
  } catch (error) {
    return respond(res, 401, { message: error.message || 'Ongeldige sessie.' });
  }

  const { db } = getFirebase();
  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' });

  try {
    const customerDoc = await db.collection('customers').doc(decodedToken.uid).get();
    const stripeCustomerId = customerDoc.exists
      ? customerDoc.get('stripeCustomerId') || customerDoc.get('stripeId')
      : null;

    if (!stripeCustomerId) {
      return respond(res, 400, { message: 'Geen Stripe-klantprofiel gevonden. Koop eerst een product.' });
    }

    const origin = req.headers.origin || `https://${req.headers.host}`;
    const returnUrl = `${origin}/`;

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
    });

    return respond(res, 200, { url: session.url });
  } catch (error) {
    return respond(res, 500, { message: 'Kon geen billing portal sessie aanmaken.' });
  }
};
