const Stripe = require('stripe');
const admin = require('firebase-admin');

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

// Credit packages — must match config.js creditPackages (credits = base + bonus total)
const CREDIT_PACKAGES = {
  credits_starter: { credits: 10000, priceId: 'price_PLACEHOLDER_STARTER' },
  credits_basic:   { credits: 55000, priceId: 'price_PLACEHOLDER_BASIC'   },
  credits_pro:     { credits: 240000, priceId: 'price_PLACEHOLDER_PRO'    },
};

function getFirebase() {
  if (!admin.apps.length) {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (serviceAccount) {
      admin.initializeApp({ credential: admin.credential.cert(JSON.parse(serviceAccount)) });
    } else {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
    }
  }
  return { auth: admin.auth(), db: admin.firestore() };
}

async function authenticate(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) throw new Error('Geen geldige auth token gevonden.');
  const idToken = authHeader.replace('Bearer ', '').trim();
  if (!idToken) throw new Error('Leeg auth token ontvangen.');
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

  let body = {};
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  } catch {
    return respond(res, 400, { message: 'Ongeldige JSON-body.' });
  }

  const { packageId } = body;
  const pkg = CREDIT_PACKAGES[packageId];
  if (!pkg) {
    return respond(res, 400, { message: 'Ongeldig credit pakket.' });
  }

  const { db } = getFirebase();
  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' });

  const origin = req.headers.origin || `https://${req.headers.host}`;
  const successUrl = `${origin}/app/settings?tab=credits&credits_claimed=1&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${origin}/app/settings?tab=credits`;

  try {
    const customerDoc = await db.collection('customers').doc(decodedToken.uid).get();
    const existingCustomerId = customerDoc.exists
      ? customerDoc.get('stripeCustomerId') || customerDoc.get('stripeId')
      : undefined;

    const sessionParams = {
      mode: 'payment',
      line_items: [{ price: pkg.priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      metadata: {
        credit_purchase: 'true',
        credit_amount: String(pkg.credits),
        package_id: packageId,
        firebase_uid: decodedToken.uid,
      },
      payment_intent_data: {
        metadata: {
          credit_purchase: 'true',
          credit_amount: String(pkg.credits),
          package_id: packageId,
          firebase_uid: decodedToken.uid,
        },
      },
    };

    if (existingCustomerId) {
      sessionParams.customer = existingCustomerId;
    } else if (decodedToken.email) {
      sessionParams.customer_email = decodedToken.email;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    const stripeCustomerId = session.customer || existingCustomerId;
    if (stripeCustomerId) {
      await db.collection('customers').doc(decodedToken.uid).set(
        {
          stripeCustomerId,
          email: decodedToken.email || '',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    return respond(res, 200, { url: session.url });
  } catch (error) {
    console.error('Buy credits checkout error:', error);
    return respond(res, 500, { message: 'Kon geen Stripe Checkout-sessie aanmaken.' });
  }
};
