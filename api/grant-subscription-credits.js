const admin = require('firebase-admin');

// Price ID → monthly credit amount (must match config.js plans)
const PLAN_CREDITS = {
  // Starter (plus)
  'price_1TDM6gLzjWXxGtsSmBBGHvnY': 5000,  // monthly
  'price_1TDMJ5LzjWXxGtsSYaGkzu7c': 5000,  // yearly
  // Pro
  'price_1TDM7zLzjWXxGtsSSjb4tnbS': 15000, // monthly
  'price_1TDMLbLzjWXxGtsS87kmPljA': 15000, // yearly
  // Elite (ultimate)
  'price_1TDM8YLzjWXxGtsSOlI0joem': 50000, // monthly
  'price_1TDMMiLzjWXxGtsSOjYwRXfP': 50000, // yearly
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

function toSeconds(ts) {
  if (!ts) return null;
  if (typeof ts.toMillis === 'function') return Math.floor(ts.toMillis() / 1000);
  if (typeof ts.seconds === 'number') return ts.seconds;
  if (typeof ts === 'number') return ts;
  return null;
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return respond(res, 405, { message: 'Method Not Allowed' });
  }

  let decodedToken;
  try {
    decodedToken = await authenticate(req);
  } catch (error) {
    return respond(res, 401, { message: error.message || 'Ongeldige sessie.' });
  }

  const { db } = getFirebase();
  const uid = decodedToken.uid;

  try {
    // Find active or trialing subscription
    const subsSnap = await db
      .collection('customers')
      .doc(uid)
      .collection('subscriptions')
      .where('status', 'in', ['active', 'trialing'])
      .limit(1)
      .get();

    if (subsSnap.empty) {
      return respond(res, 400, { message: 'Geen actief abonnement gevonden.' });
    }

    const subData = subsSnap.docs[0].data();
    const periodStart = toSeconds(subData.current_period_start);
    if (!periodStart) {
      return respond(res, 400, { message: 'Abonnement periode informatie ontbreekt.' });
    }

    // Determine monthly credits based on price ID
    const priceId = subData.price?.id || subData.items?.[0]?.price?.id || null;
    const monthlyCredits = priceId ? (PLAN_CREDITS[priceId] || 0) : 0;
    if (!monthlyCredits) {
      return respond(res, 400, { message: 'Geen credits gevonden voor dit abonnement.' });
    }

    // Check idempotency: has user already received credits for this billing period?
    const customerRef = db.collection('customers').doc(uid);
    const customerSnap = await customerRef.get();
    const lastGrant = customerSnap.exists
      ? (customerSnap.data().credits?.lastSubscriptionGrant || null)
      : null;
    const lastGrantSeconds = toSeconds(lastGrant);

    if (lastGrantSeconds !== null && lastGrantSeconds >= periodStart) {
      return respond(res, 200, { already_granted: true, amount: monthlyCredits });
    }

    // Grant credits via atomic batch write
    const txId = `${uid}_sub_${periodStart}`;
    const txRef = customerRef.collection('credit_transactions').doc(txId);

    // Extra idempotency check on transaction doc (handles race conditions)
    const txSnap = await txRef.get();
    if (txSnap.exists) {
      return respond(res, 200, { already_granted: true, amount: monthlyCredits });
    }

    const batch = db.batch();

    batch.set(
      customerRef,
      {
        credits: {
          bonus: admin.firestore.FieldValue.increment(monthlyCredits),
          lastSubscriptionGrant: admin.firestore.FieldValue.serverTimestamp(),
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    batch.set(txRef, {
      type: 'subscription',
      amount: monthlyCredits,
      priceId: priceId || '',
      description: `${monthlyCredits.toLocaleString()} monthly subscription credits`,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();

    return respond(res, 200, { granted: true, amount: monthlyCredits });
  } catch (error) {
    console.error('Grant subscription credits error:', error);
    return respond(res, 500, { message: 'Kon subscription credits niet toewijzen.' });
  }
};
