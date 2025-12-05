# 🚀 Complete Webhook Setup Guide

This guide will help you set up Stripe webhooks to automatically save subscriptions.

## Prerequisites

1. ✅ Supabase project URL: `https://cwkaqyxbughjtkbukliq.supabase.co`
2. ✅ Stripe account (test mode)
3. ✅ Supabase CLI installed

## Step-by-Step Setup

### Step 1: Install Supabase CLI (if not already installed)

```bash
npm install -g supabase
```

### Step 2: Login to Supabase

```bash
supabase login
```

This will open a browser window for authentication.

### Step 3: Link Your Project

```bash
supabase link --project-ref cwkaqyxbughjtkbukliq
```

### Step 4: Get Your Supabase Service Role Key

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/cwkaqyxbughjtkbukliq)
2. Click **Settings** (gear icon) → **API**
3. Scroll down to **Project API keys**
4. Copy the **`service_role`** key (⚠️ Keep this secret! It bypasses RLS)
   - It should look like: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### Step 5: Get Your Stripe Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
2. Copy your **Secret key** (starts with `sk_test_...`)
3. You'll also need this for the webhook secret later

### Step 6: Set Environment Variables

Run these commands to set the secrets:

```bash
# Set Stripe secret key (for processing payments)
supabase secrets set STRIPE_SECRET_KEY=sk_test_your_secret_key_here

# Set Supabase URL (for database access)
supabase secrets set SUPABASE_URL=https://cwkaqyxbughjtkbukliq.supabase.co

# Set Supabase service role key (for bypassing RLS to save subscriptions)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Note:** Replace `your_secret_key_here` and `your_service_role_key_here` with your actual keys!

### Step 7: Deploy the Webhook Function

```bash
supabase functions deploy stripe-webhook
```

You should see output like:
```
Deploying function stripe-webhook...
Function stripe-webhook deployed successfully!
```

### Step 8: Get Your Webhook URL

After deployment, your webhook URL will be:
```
https://cwkaqyxbughjtkbukliq.supabase.co/functions/v1/stripe-webhook
```

### Step 9: Configure Webhook in Stripe Dashboard

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/webhooks)
2. Click **"Add endpoint"**
3. Enter your webhook URL:
   ```
   https://cwkaqyxbughjtkbukliq.supabase.co/functions/v1/stripe-webhook
   ```
4. Click **"Select events"** and choose:
   - ✅ `checkout.session.completed`
5. Click **"Add endpoint"**

### Step 10: Get Webhook Signing Secret

1. After creating the webhook, click on it
2. Click **"Reveal"** next to **"Signing secret"**
3. Copy the secret (starts with `whsec_...`)

### Step 11: Set Webhook Secret

```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

Replace `whsec_your_webhook_secret_here` with your actual webhook secret!

### Step 12: Test the Webhook

1. Make a test payment on your pricing page
2. Check Stripe Dashboard → Webhooks → Your endpoint → **"Recent events"**
   - You should see a `checkout.session.completed` event
   - Status should be green ✅
3. Check your Supabase `subscriptions` table - the subscription should be there!

---

## Troubleshooting

### Webhook Not Receiving Events

1. **Check Stripe Dashboard**:
   - Go to Webhooks → Your endpoint
   - Click on an event
   - Check the response/error message

2. **Check Supabase Logs**:
   ```bash
   supabase functions logs stripe-webhook
   ```

3. **Verify Secrets Are Set**:
   ```bash
   supabase secrets list
   ```
   Should show:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

### Subscription Not Saving

1. **Check if metadata is being sent**:
   - The Edge Function that creates the checkout session must include metadata
   - Check `supabase/functions/create-subscription-intent/index.ts` line 76-82

2. **Check user ID**:
   - The checkout session metadata must include `userId`
   - User must be authenticated when creating the checkout session

3. **Check Supabase logs**:
   ```bash
   supabase functions logs stripe-webhook --tail
   ```

### "User ID is anonymous" Error

This means the checkout session was created without a `userId` in metadata. Make sure:
1. User is logged in when clicking "Start Free Trial"
2. The `createSubscriptionIntent` function is called with `userId: user?.id`
3. Check `components/Pricing.tsx` line 131

---

## Quick Command Reference

```bash
# Login to Supabase
supabase login

# Link project
supabase link --project-ref cwkaqyxbughjtkbukliq

# Set secrets
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set SUPABASE_URL=https://cwkaqyxbughjtkbukliq.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# Deploy function
supabase functions deploy stripe-webhook

# Check logs
supabase functions logs stripe-webhook --tail

# List secrets
supabase secrets list
```

---

## What Happens After Setup

1. ✅ User completes payment on Stripe
2. ✅ Stripe sends `checkout.session.completed` event to your webhook
3. ✅ Webhook automatically saves subscription to Supabase
4. ✅ User profile is updated with subscription info
5. ✅ User redirected back to your site (confirmation page)

**The subscription is saved automatically - no URL parameters needed!** 🎉

