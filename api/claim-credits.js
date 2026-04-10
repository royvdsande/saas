const Stripe = require('stripe');
const admin = require('firebase-admin');

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

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
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
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

  const sessionId = (req.query?.session_id || '').trim();
  if (!sessionId) {
    return respond(res, 400, { message: 'session_id is verplicht.' });
  }

  const { db } = getFirebase();
  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' });

  try {
    // Retrieve the Stripe checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Verify payment succeeded
    if (session.payment_status !== 'paid') {
      return respond(res, 400, { message: 'Betaling is nog niet voltooid.' });
    }

    // Verify this session belongs to the authenticated user
    const metaUid = session.metadata?.firebase_uid;
    if (metaUid && metaUid !== decodedToken.uid) {
      return respond(res, 403, { message: 'Deze sessie hoort niet bij uw account.' });
    }

    const creditAmount = parseInt(session.metadata?.credit_amount || '0', 10);
    if (!creditAmount || creditAmount <= 0) {
      return respond(res, 400, { message: 'Ongeldig credit bedrag in sessie metadata.' });
    }

    const packageId = session.metadata?.package_id || 'unknown';

    // Idempotency check — use session ID as transaction doc ID
    const txRef = db
      .collection('customers')
      .doc(decodedToken.uid)
      .collection('credit_transactions')
      .doc(sessionId);

    const txSnap = await txRef.get();
    if (txSnap.exists) {
      return respond(res, 200, { success: true, already_claimed: true, credits: creditAmount });
    }

    // Add credits atomically
    const customerRef = db.collection('customers').doc(decodedToken.uid);
    const batch = db.batch();

    batch.set(
      customerRef,
      {
        credits: {
          purchased: admin.firestore.FieldValue.increment(creditAmount),
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    batch.set(txRef, {
      type: 'purchase',
      amount: creditAmount,
      packageId,
      sessionId,
      description: `${creditAmount} credits purchased`,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();

    return respond(res, 200, { success: true, credits: creditAmount });
  } catch (error) {
    console.error('Claim credits error:', error);
    return respond(res, 500, { message: 'Kon credits niet verwerken.' });
  }
};
