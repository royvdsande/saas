const Stripe = require('stripe');
const admin = require('firebase-admin');

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const priceId = process.env.STRIPE_PRICE_ID || 'price_1SmVggLzjWXxGtsShYIXmRVx';

function getFirebase() {
  if (!admin.apps.length) {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;

    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(serviceAccount)),
      });
    } else {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    }
  }

  return { auth: admin.auth(), db: admin.firestore() };
}

async function authenticate(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }

  const idToken = authHeader.replace('Bearer ', '').trim();
  if (!idToken) return null;

  try {
    const { auth } = getFirebase();
    return await auth.verifyIdToken(idToken);
  } catch {
    return null;
  }
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

  // Try to authenticate (optional for onboarding flow)
  const decodedToken = await authenticate(req);

  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' });

  let body = {};
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  } catch (error) {
    return respond(res, 400, { message: 'Ongeldige JSON-body.' });
  }

  const isOnboarding = body.onboarding === true;
  const email = (decodedToken?.email || body.email || '').trim();

  if (!email) {
    return respond(res, 400, { message: 'E-mailadres is verplicht.' });
  }

  // For authenticated requests, require valid token
  if (!isOnboarding && !decodedToken) {
    return respond(res, 401, { message: 'Geen geldige auth token gevonden. Log opnieuw in.' });
  }

  const selectedPriceId = body.priceId || priceId;
  const origin = req.headers.origin || `https://${req.headers.host}`;

  try {
    const { db } = getFirebase();
    let existingCustomerId;

    // Look up existing Stripe customer by Firebase UID
    if (decodedToken?.uid) {
      const customerDoc = await db.collection('customers').doc(decodedToken.uid).get();
      existingCustomerId = customerDoc.exists
        ? customerDoc.get('stripeCustomerId') || customerDoc.get('stripeId')
        : undefined;
    }

    if (isOnboarding) {
      // Onboarding flow: subscription with 7-day free trial, no auth required
      const successUrl = `${origin}/auth/signup.html?checkout=success&email=${encodeURIComponent(email)}`;
      const cancelUrl = `${origin}/onboarding`;

      const sessionParams = {
        mode: 'subscription',
        customer_email: existingCustomerId ? undefined : email,
        customer: existingCustomerId || undefined,
        billing_address_collection: 'auto',
        line_items: [{ price: selectedPriceId, quantity: 1 }],
        subscription_data: {
          trial_period_days: 7,
          metadata: {
            binas_premium: 'true',
            source: 'onboarding',
          },
        },
        allow_promotion_codes: true,
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          binas_premium: 'true',
          price_id: selectedPriceId,
          source: 'onboarding',
          firebase_email: email,
        },
      };

      const session = await stripe.checkout.sessions.create(sessionParams);
      return respond(res, 200, { url: session.url });
    }

    // Authenticated flow (from dashboard/pricing)
    const successUrl = body.successUrl || `${origin}/?status=success`;
    const cancelUrl = body.cancelUrl || `${origin}/?status=cancel`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: existingCustomerId ? undefined : email,
      customer: existingCustomerId || undefined,
      billing_address_collection: 'auto',
      line_items: [{ price: selectedPriceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        binas_premium: 'true',
        price_id: selectedPriceId,
        firebase_uid: decodedToken.uid,
        firebase_email: email,
      },
      payment_intent_data: {
        metadata: {
          binas_premium: 'true',
          price_id: selectedPriceId,
          firebase_uid: decodedToken.uid,
          firebase_email: email,
        },
      },
    });

    const stripeCustomerId = session.customer || existingCustomerId;
    if (stripeCustomerId) {
      await db
        .collection('customers')
        .doc(decodedToken.uid)
        .set(
          {
            stripeCustomerId,
            email,
            lastCheckoutSessionId: session.id,
            premium: { active: false },
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
    }

    return respond(res, 200, { url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return respond(res, 500, { message: 'Kon geen Stripe Checkout-sessie aanmaken.' });
  }
};
