# Stripe Payment Integration Setup

This guide will help you set up Stripe payments for LoadMaster subscriptions.

## Prerequisites

1. A Stripe account (sign up at https://stripe.com)
2. Backend server (Node.js/Express, Supabase Edge Functions, or similar)
3. Environment variables configured

## Step 1: Get Your Stripe Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers** → **API keys**
3. Copy your **Publishable key** (starts with `pk_`)
4. Copy your **Secret key** (starts with `sk_`) - Keep this secure!

## Step 2: Create Products and Prices in Stripe

1. Go to **Products** in Stripe Dashboard
2. Create products for each plan:
   - **Essential Plan**
     - Create product: "LoadMaster Essential"
     - Add price: $99/month (recurring)
     - Add price: $85/month (recurring, annual billing)
     - Copy the Price IDs (start with `price_`)
   
   - **Professional Plan**
     - Create product: "LoadMaster Professional"
     - Add price: $199/month (recurring)
     - Add price: $170/month (recurring, annual billing)
     - Copy the Price IDs

3. Update `services/stripeClient.ts` with your actual Price IDs:
   ```typescript
   export const STRIPE_PLAN_IDS: Record<string, { monthly: string; annual: string }> = {
     essential: {
       monthly: 'price_your_essential_monthly_id',
       annual: 'price_your_essential_annual_id',
     },
     professional: {
       monthly: 'price_your_professional_monthly_id',
       annual: 'price_your_professional_annual_id',
     },
   };
   ```

## Step 3: Set Environment Variables

Create a `.env.local` file in the root directory:

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
```

For production, use your live keys (starting with `pk_live_`).

## Step 4: Set Up Backend API Endpoints

You need to create backend endpoints to securely handle Stripe checkout sessions. 

### Option A: Using Supabase Edge Functions (Recommended)

Create a Supabase Edge Function for checkout:

```typescript
// supabase/functions/create-checkout-session/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from 'https://esm.sh/stripe@13.6.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const { planId, interval, customerEmail } = await req.json()
    
    // Get price ID based on plan
    const priceId = getPriceId(planId, interval)
    
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
      success_url: `${req.headers.get('origin')}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/pricing`,
      metadata: {
        planId,
        interval,
      },
    })

    return new Response(
      JSON.stringify({ sessionId: session.id }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})

function getPriceId(planId: string, interval: string): string {
  // Return the appropriate Stripe Price ID
  // This should match your STRIPE_PLAN_IDS mapping
}
```

### Option B: Using Node.js/Express Backend

See `backend-example/` directory for a complete Express.js example.

## Step 5: Update Frontend Payment Service

Update `services/paymentService.ts` to call your backend API:

```typescript
export const createCheckoutSession = async (
  planId: 'essential' | 'professional',
  interval: 'month' | 'year',
  customerEmail?: string
): Promise<{ sessionId: string | null; error: string | null }> => {
  try {
    const response = await fetch('https://your-api-url.com/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId, interval, customerEmail }),
    });
    
    const { sessionId, error } = await response.json();
    return { sessionId, error };
  } catch (error: any) {
    return { sessionId: null, error: error.message };
  }
};
```

## Step 6: Set Up Webhooks (Important!)

Create a webhook endpoint to handle subscription events:

1. Go to Stripe Dashboard → **Developers** → **Webhooks**
2. Add endpoint: `https://your-api-url.com/api/webhooks/stripe`
3. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

4. Implement webhook handler to update user subscription status in database

## Step 7: Database Migration

Run the migration to add subscription fields:

```sql
-- Add subscription fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS subscription_plan TEXT,
ADD COLUMN IF NOT EXISTS subscription_status TEXT,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer ON profiles(stripe_customer_id);
```

Run this in your Supabase SQL Editor.

## Step 8: Test

1. Use Stripe test mode keys
2. Test with Stripe test cards:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - 3D Secure: `4000 0025 0000 3155`
3. Use any future expiry date and any 3-digit CVC

## Security Notes

- Never expose your Stripe secret key in client-side code
- Always use HTTPS in production
- Validate webhook signatures
- Use environment variables for all keys
- Implement rate limiting on API endpoints

## Support

For issues or questions:
- Stripe Documentation: https://stripe.com/docs
- Stripe Support: https://support.stripe.com

