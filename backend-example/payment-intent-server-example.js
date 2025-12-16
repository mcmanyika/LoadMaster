/**
 * Example Express.js backend server for Stripe Payment Intent integration
 * 
 * This is a reference implementation using Payment Intents instead of Checkout Sessions.
 * You'll need to:
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

// Price IDs from your Stripe dashboard (for subscriptions)
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

// Plan amounts in dollars
const PLAN_AMOUNTS = {
  essential: {
    monthly: 24.99,
    annual: 254.90, // $21.24/month × 12 = $254.90/year (15% discount)
  },
  professional: {
    monthly: 44.99,
    annual: 458.90, // $38.24/month × 12 = $458.90/year (15% discount)
  },
};

/**
 * Create Stripe Payment Intent
 * POST /api/create-payment-intent
 */
app.post('/api/create-payment-intent', async (req, res) => {
  try {
    const { planId, interval, amount, customerEmail } = req.body;

    if (!planId || !interval || !amount || !customerEmail) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Find or create customer
    let customer;
    const customers = await stripe.customers.list({
      email: customerEmail,
      limit: 1,
    });

    if (customers.data.length > 0) {
      customer = customers.data[0];
    } else {
      customer = await stripe.customers.create({
        email: customerEmail,
      });
    }

    // Create Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount, // Amount in cents
      currency: 'usd',
      customer: customer.id,
      metadata: {
        planId,
        interval,
        customerEmail,
      },
      description: `LoadMaster ${planId} subscription (${interval}ly)`,
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create Subscription after Payment Intent succeeds
 * POST /api/create-subscription
 */
app.post('/api/create-subscription', async (req, res) => {
  try {
    const { planId, interval, paymentIntentId, customerEmail } = req.body;

    if (!planId || !interval || !paymentIntentId || !customerEmail) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify payment intent was successful
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ error: 'Payment intent not succeeded' });
    }

    // Find customer
    const customers = await stripe.customers.list({
      email: customerEmail,
      limit: 1,
    });

    if (customers.data.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const customer = customers.data[0];

    // Get the payment method from the payment intent
    const paymentMethodId = paymentIntent.payment_method;

    if (!paymentMethodId) {
      return res.status(400).json({ error: 'Payment method not found' });
    }

    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customer.id,
    });

    // Set as default payment method
    await stripe.customers.update(customer.id, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // Get price ID
    const priceId = PRICE_IDS[planId]?.[interval === 'month' ? 'monthly' : 'annual'];

    if (!priceId) {
      return res.status(400).json({ error: 'Invalid plan or interval' });
    }

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        planId,
        interval,
      },
    });

    // Update user subscription in your database here
    // await updateUserSubscription(customerEmail, {
    //   subscriptionId: subscription.id,
    //   plan: planId,
    //   status: subscription.status,
    //   stripeCustomerId: customer.id,
    // });

    res.json({
      subscriptionId: subscription.id,
      status: subscription.status,
      clientSecret: subscription.latest_invoice?.payment_intent?.client_secret,
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
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
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      // Handle successful payment
      await handlePaymentIntentSucceeded(paymentIntent);
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
async function handlePaymentIntentSucceeded(paymentIntent) {
  // TODO: Update user's payment status in database
  console.log('Payment intent succeeded:', paymentIntent.id);
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
  console.log(`Payment Intent endpoint: http://localhost:${PORT}/api/create-payment-intent`);
  console.log(`Webhook endpoint: http://localhost:${PORT}/api/webhooks/stripe`);
});

