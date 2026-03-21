const OpenAI = require('openai');
const Stripe = require('stripe');
const admin = require('firebase-admin');

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;

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
    throw new Error('No valid auth token found.');
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

  if (!openaiApiKey) {
    return respond(res, 500, { message: 'OpenAI API key missing from configuration.' });
  }

  let decodedToken;
  try {
    decodedToken = await authenticate(req);
  } catch (error) {
    return respond(res, 401, { message: error.message || 'Invalid session.' });
  }

  let body = {};
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString();
    if (raw) body = JSON.parse(raw);
  } catch {
    return respond(res, 400, { message: 'Invalid request body.' });
  }

  const { messages } = body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return respond(res, 400, { message: 'No messages provided.' });
  }

  // Gather billing context from Stripe
  let billingContext = 'No billing information available.';
  if (stripeSecretKey) {
    try {
      const { db } = getFirebase();
      const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' });

      const customerDoc = await db.collection('customers').doc(decodedToken.uid).get();
      const stripeCustomerId = customerDoc.exists
        ? customerDoc.get('stripeCustomerId') || customerDoc.get('stripeId')
        : null;

      if (stripeCustomerId) {
        const [subscriptions, invoices] = await Promise.all([
          stripe.subscriptions.list({ customer: stripeCustomerId, limit: 3 }),
          stripe.invoices.list({ customer: stripeCustomerId, limit: 3 }),
        ]);

        const activeSub = subscriptions.data.find((s) =>
          ['active', 'trialing'].includes(s.status)
        );

        const subInfo = activeSub
          ? `Active subscription: ${activeSub.id}, status: ${activeSub.status}, plan: ${activeSub.items.data[0]?.price?.nickname || activeSub.items.data[0]?.price?.id || 'unknown'}`
          : 'No active subscription.';

        const invoiceInfo = invoices.data.length
          ? invoices.data
              .map((inv) => `Invoice ${inv.id}: ${inv.status}, amount: ${(inv.amount_due / 100).toFixed(2)} ${inv.currency.toUpperCase()}, date: ${new Date(inv.created * 1000).toISOString().split('T')[0]}`)
              .join('\n')
          : 'No invoices found.';

        billingContext = `Customer ID: ${stripeCustomerId}\n${subInfo}\nRecent invoices:\n${invoiceInfo}`;
      }
    } catch {
      // Non-fatal — proceed without billing context
    }
  }

  const systemPrompt = `You are a helpful AI assistant for FitFlow, a SaaS platform. You help users with questions about their account, billing, and the product.

Current user billing context:
${billingContext}

Be concise, friendly, and helpful. If you don't know something specific, say so honestly. Don't make up subscription details that aren't in the billing context above.`;

  try {
    const openai = new OpenAI({ apiKey: openaiApiKey });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.slice(-20), // keep last 20 messages for context
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const reply = response.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
    return respond(res, 200, { message: reply });
  } catch (error) {
    return respond(res, 500, { message: 'Could not reach the AI service. Please try again.' });
  }
};
