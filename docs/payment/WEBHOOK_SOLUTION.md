# ✅ Solution: Use Webhook for Auto-Save (Most Reliable!)

## The Problem

From your console output, I can see:

- `payment: null` - No payment parameter in URL
- `sessionId: null` - No session ID in URL
- `fullURL: "http://localhost:3000/"` - No query parameters at all!

**Stripe Checkout Sessions are redirecting but not preserving query parameters in the URL!**

## ✅ Best Solution: Use Stripe Webhooks

Webhooks are the **most reliable** way to capture payment data. Stripe sends an event directly to your server when payment succeeds.

### How Webhooks Work

1. User completes payment on Stripe
2. Stripe sends `checkout.session.completed` event to your webhook
3. Webhook receives the session with all metadata
4. Webhook automatically saves subscription to Supabase
5. User redirected back to your site (just for confirmation)

## What I've Created

I've created a webhook handler at:

- `supabase/functions/stripe-webhook/index.ts`

This webhook:

- ✅ Receives Stripe events
- ✅ Extracts metadata (planId, interval, userId)
- ✅ Auto-saves subscription to Supabase
- ✅ Updates user profile

## Setup Steps

### Step 1: Deploy Webhook Function

```bash
supabase functions deploy stripe-webhook
```

### Step 2: Get Webhook URL

After deployment, get the webhook URL:

```
https://cwkaqyxbughjtkbukliq.supabase.co/functions/v1/stripe-webhook
```

### Step 3: Configure in Stripe Dashboard

1. Go to **Stripe Dashboard** → **Developers** → **Webhooks**
2. Click **"Add endpoint"**
3. Enter webhook URL:
   ```
   https://cwkaqyxbughjtkbukliq.supabase.co/functions/v1/stripe-webhook
   ```
4. Select events to listen to:
   - `checkout.session.completed` ✅
5. Click **"Add endpoint"**

### Step 4: Get Webhook Secret

After creating the webhook:

1. Click on the webhook endpoint
2. Click **"Reveal"** next to "Signing secret"
3. Copy the secret (starts with `whsec_...`)

### Step 5: Set Webhook Secret

```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
```

### Step 6: Set Supabase Credentials

```bash
supabase secrets set SUPABASE_URL=https://cwkaqyxbughjtkbukliq.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

## Benefits

- ✅ **Most reliable** - Works even if redirect fails
- ✅ **Automatic** - No user action needed
- ✅ **Secure** - Stripe verifies the webhook signature
- ✅ **Complete data** - Gets all payment details from Stripe

## How It Works After Setup

1. User completes payment
2. Stripe sends webhook to your Edge Function
3. Webhook auto-saves subscription to Supabase
4. User redirected back (just for confirmation page)
5. Subscription is already saved! ✅

---

**This is the most reliable way to capture subscription data!** 🎉
