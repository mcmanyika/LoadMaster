/**
 * Example Express.js backend server for Stripe integration
 * 
 * This is a reference implementation. You'll need to:
 * 1. Install dependencies: npm install express stripe dotenv cors
 * 2. Set STRIPE_SECRET_KEY in environment variables
 * 3. Set up your database connection
 * 4. Configure CORS for your frontend domain
 */

const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const cors = require('cors');

const app = express();

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());

// Price IDs from your Stripe dashboard
const PRICE_IDS = {
  essential: {
    monthly: 'price_your_essential_monthly_id',
    annual: 'price_your_essential_annual_id',
  },
  professional: {
    monthly: 'price_your_professional_monthly_id',
    annual: 'price_your_professional_annual_id',
  },
};

/**
 * Create Stripe Checkout Session
 * POST /api/create-checkout-session
 */
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { planId, interval, customerEmail } = req.body;

    if (!planId || !interval || !customerEmail) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const priceId = PRICE_IDS[planId]?.[interval === 'month' ? 'monthly' : 'annual'];

    if (!priceId) {
      return res.status(400).json({ error: 'Invalid plan or interval' });
    }

    const session = await stripe.checkout.sessions.create({
      customer_email: customerEmail,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/pricing`,
      metadata: {
        planId,
        interval,
      },
    });

    res.json({ sessionId: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create Customer Portal Session
 * POST /api/create-portal-session
 */
app.post('/api/create-portal-session', async (req, res) => {
  try {
    const { customerId } = req.body;

    if (!customerId) {
      return res.status(400).json({ error: 'Customer ID required' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Stripe Webhook Handler
 * POST /api/webhooks/stripe
 * 
 * Important: Use Stripe CLI for local testing:
 * stripe listen --forward-to localhost:3000/api/webhooks/stripe
 */
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      // Update user subscription in database
      await handleCheckoutCompleted(session);
      break;

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      const subscription = event.data.object;
      // Update subscription status in database
      await handleSubscriptionUpdate(subscription);
      break;

    case 'customer.subscription.deleted':
      const deletedSubscription = event.data.object;
      // Mark subscription as canceled in database
      await handleSubscriptionDeleted(deletedSubscription);
      break;

    case 'invoice.payment_succeeded':
      const invoice = event.data.object;
      // Handle successful payment
      await handlePaymentSucceeded(invoice);
      break;

    case 'invoice.payment_failed':
      const failedInvoice = event.data.object;
      // Handle failed payment
      await handlePaymentFailed(failedInvoice);
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

// Helper functions for webhook handlers
async function handleCheckoutCompleted(session) {
  // TODO: Update user's subscription status in database
  // 1. Find user by email (session.customer_email)
  // 2. Update subscription_plan, subscription_status, stripe_customer_id
  console.log('Checkout completed:', session.id);
}

async function handleSubscriptionUpdate(subscription) {
  // TODO: Update subscription status in database
  console.log('Subscription updated:', subscription.id);
}

async function handleSubscriptionDeleted(subscription) {
  // TODO: Mark subscription as canceled in database
  console.log('Subscription deleted:', subscription.id);
}

async function handlePaymentSucceeded(invoice) {
  // TODO: Update subscription status to active
  console.log('Payment succeeded:', invoice.id);
}

async function handlePaymentFailed(invoice) {
  // TODO: Update subscription status to past_due
  console.log('Payment failed:', invoice.id);
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Webhook endpoint: http://localhost:${PORT}/api/webhooks/stripe`);
});

