/**
 * Simple Backend Server for Stripe Payment Intents
 * 
 * Quick Start:
 * 1. npm install express stripe cors dotenv
 * 2. Create .env file with: STRIPE_SECRET_KEY=sk_test_...
 * 3. node server.js
 */

const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || '');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({ 
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true 
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend server is running' });
});

// Create Payment Intent endpoint
app.post('/api/create-payment-intent', async (req, res) => {
  try {
    const { planId, interval, amount, customerEmail } = req.body;

    console.log('Received payment intent request:', { planId, interval, amount, customerEmail });

    // Validation
    if (!planId || !interval || !amount || !customerEmail) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        received: { planId, interval, amount, customerEmail }
      });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ 
        error: 'Stripe secret key not configured. Set STRIPE_SECRET_KEY in .env file.'
      });
    }

    // Find or create customer
    let customer;
    try {
      const customers = await stripe.customers.list({
        email: customerEmail,
        limit: 1,
      });

      if (customers.data.length > 0) {
        customer = customers.data[0];
        console.log('Found existing customer:', customer.id);
      } else {
        customer = await stripe.customers.create({
          email: customerEmail,
        });
        console.log('Created new customer:', customer.id);
      }
    } catch (customerError) {
      console.error('Error with customer:', customerError);
      return res.status(500).json({ 
        error: `Failed to create/find customer: ${customerError.message}` 
      });
    }

    // Create Payment Intent
    try {
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

      console.log('Payment intent created:', paymentIntent.id);

      res.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      });
    } catch (stripeError) {
      console.error('Stripe error:', stripeError);
      return res.status(500).json({ 
        error: `Stripe error: ${stripeError.message}` 
      });
    }
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Create Subscription after Payment Intent succeeds
app.post('/api/create-subscription', async (req, res) => {
  try {
    const { planId, interval, paymentIntentId, customerEmail } = req.body;

    console.log('Received subscription request:', { planId, interval, paymentIntentId, customerEmail });

    if (!planId || !interval || !paymentIntentId || !customerEmail) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify payment intent was successful
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ 
        error: `Payment intent not succeeded. Status: ${paymentIntent.status}` 
      });
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

    // Price IDs - UPDATE THESE WITH YOUR ACTUAL STRIPE PRICE IDs
    const PRICE_IDS = {
      essential: {
        monthly: process.env.STRIPE_PRICE_ESSENTIAL_MONTHLY || 'price_essential_monthly',
        annual: process.env.STRIPE_PRICE_ESSENTIAL_ANNUAL || 'price_essential_annual',
      },
      professional: {
        monthly: process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY || 'price_professional_monthly',
        annual: process.env.STRIPE_PRICE_PROFESSIONAL_ANNUAL || 'price_professional_annual',
      },
    };

    const priceId = PRICE_IDS[planId]?.[interval === 'month' ? 'monthly' : 'annual'];

    if (!priceId || priceId === `price_${planId}_${interval === 'month' ? 'monthly' : 'annual'}`) {
      console.warn(`⚠️  Using placeholder price ID. Please update PRICE_IDS in server.js with your actual Stripe Price IDs.`);
      // For now, we'll create a subscription without a price ID (this won't work, but shows the error)
      return res.status(400).json({ 
        error: `Price ID not configured. Please update PRICE_IDS in server.js with your actual Stripe Price IDs from your Stripe dashboard.` 
      });
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

    console.log('Subscription created:', subscription.id);

    res.json({
      subscriptionId: subscription.id,
      status: subscription.status,
      clientSecret: subscription.latest_invoice?.payment_intent?.client_secret,
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ error: error.message || 'Failed to create subscription' });
  }
});

// Create Customer Portal Session
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

// Start server
app.listen(PORT, () => {
  console.log('\n✅ Backend server is running!');
  console.log(`📍 Server URL: http://localhost:${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`💳 Payment Intent: http://localhost:${PORT}/api/create-payment-intent`);
  
  if (!process.env.STRIPE_SECRET_KEY) {
    console.warn('\n⚠️  WARNING: STRIPE_SECRET_KEY not set in .env file');
    console.warn('   Create a .env file with: STRIPE_SECRET_KEY=sk_test_...\n');
  } else {
    console.log('✅ Stripe secret key is configured\n');
  }
});

