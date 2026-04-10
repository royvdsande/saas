const OpenAI = require('openai');
const Stripe = require('stripe');

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;

function decodeJwtPayload(token) {
  try {
    const payload = token.split('.')[1];
    const decoded = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    return JSON.parse(decoded);
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

  if (!openaiApiKey) {
    return respond(res, 500, { message: 'OpenAI API key missing from configuration.' });
  }

  // Decode JWT to get user email (no Admin SDK needed)
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  const jwtPayload = token ? decodeJwtPayload(token) : null;
  const userEmail = jwtPayload?.email || null;

  let body = {};
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString();
    if (raw) body = JSON.parse(raw);
  } catch {
    return respond(res, 400, { message: 'Invalid request body.' });
  }

  const { messages, planContext } = body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return respond(res, 400, { message: 'No messages provided.' });
  }

  // Build fitness context block from plan data passed by the client
  let fitnessContext = '';
  if (planContext) {
    const parts = [];
    if (planContext.summary)          parts.push(`Plan summary: ${planContext.summary}`);
    if (planContext.dailyCalories)    parts.push(`Daily calorie target: ${planContext.dailyCalories} kcal`);
    if (planContext.dailyMacros) {
      const m = planContext.dailyMacros;
      parts.push(`Macros: protein ${m.protein ?? '?'}g, carbs ${m.carbs ?? '?'}g, fat ${m.fat ?? '?'}g`);
    }
    if (planContext.workoutSplit)     parts.push(`Workout split: ${planContext.workoutSplit}`);
    if (planContext.workoutFrequency) parts.push(`Training frequency: ${planContext.workoutFrequency}x per week`);
    if (planContext.workoutDuration)  parts.push(`Session duration: ~${planContext.workoutDuration} min`);
    if (planContext.dietaryPreference && planContext.dietaryPreference !== 'no-preference')
      parts.push(`Dietary preference: ${planContext.dietaryPreference}`);
    if (parts.length) fitnessContext = `\n\nUser's fitness plan:\n${parts.join('\n')}`;
  }

  // Gather billing context from Stripe using the user's email
  let billingContext = 'No billing information available.';
  if (stripeSecretKey && userEmail) {
    try {
      const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' });

      const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
      const customer = customers.data[0];

      if (customer) {
        const [subscriptions, invoices] = await Promise.all([
          stripe.subscriptions.list({ customer: customer.id, limit: 3 }),
          stripe.invoices.list({ customer: customer.id, limit: 3 }),
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

        billingContext = `Customer ID: ${customer.id}\n${subInfo}\nRecent invoices:\n${invoiceInfo}`;
      }
    } catch {
      // Non-fatal — proceed without billing context
    }
  }

  const systemPrompt = `You are FitFlow AI, a personal fitness and nutrition assistant. You help users understand their training plan, nutrition targets, workout techniques, and healthy habits.${fitnessContext}

Current user billing context:
${billingContext}

Be concise, encouraging, and specific to the user's plan when relevant. If a question is outside fitness or health, gently redirect. Do not invent plan details that are not provided above.`;

  try {
    const openai = new OpenAI({ apiKey: openaiApiKey });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.slice(-20),
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
