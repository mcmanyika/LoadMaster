# 🚀 Stripe Webhook Setup - Step by Step

Let's set up the webhook so subscriptions are automatically saved when payments complete!

## Quick Overview

The webhook will:
1. Listen for Stripe payment events
2. Automatically save subscriptions to Supabase
3. Update user profiles
4. Work even if redirect URL fails!

---

## Step 1: Check Supabase Project Link

First, let's check if your project is linked:

```bash
cd /Users/micah/Documents/dapp/LoadMaster
supabase status
```

If it shows "Not linked", we'll link it in the next step.

---

## Step 2: Link Your Supabase Project

Your project reference is: `cwkaqyxbughjtkbukliq`

Run:
```bash
supabase link --project-ref cwkaqyxbughjtkbukliq
```

This will ask you for your database password. You can find it in:
- Supabase Dashboard → Settings → Database → Database password

---

## Step 3: Get Your Service Role Key

The webhook needs a service role key to save data (it bypasses Row Level Security).

1. Go to: https://supabase.com/dashboard/project/cwkaqyxbughjtkbukliq/settings/api
2. Scroll to **"Project API keys"**
3. Find the **`service_role`** key
4. ⚠️ **IMPORTANT:** This key bypasses security! Keep it secret!
5. Copy it (it's a long JWT token)

---

## Step 4: Get Your Stripe Keys

1. Go to: https://dashboard.stripe.com/test/apikeys
2. Copy your **Secret key** (starts with `sk_test_...`)
3. Keep this page open - you'll need it again for the webhook secret

---

## Step 5: Set Environment Variables

Now set all the secrets. Replace the values with your actual keys:

```bash
# Set Stripe secret key
supabase secrets set STRIPE_SECRET_KEY=sk_test_YOUR_STRIPE_SECRET_KEY

# Set Supabase URL
supabase secrets set SUPABASE_URL=https://cwkaqyxbughjtkbukliq.supabase.co

# Set Supabase service role key (the one you copied in Step 3)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY_HERE
```

**Example:**
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_51AbC123...
supabase secrets set SUPABASE_URL=https://cwkaqyxbughjtkbukliq.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Step 6: Deploy the Webhook Function

Now deploy the webhook handler:

```bash
supabase functions deploy stripe-webhook
```

You should see:
```
Deploying function stripe-webhook...
Function stripe-webhook deployed successfully!
```

After deployment, your webhook URL will be:
```
https://cwkaqyxbughjtkbukliq.supabase.co/functions/v1/stripe-webhook
```

---

## Step 7: Configure Webhook in Stripe Dashboard

1. Go to: https://dashboard.stripe.com/test/webhooks
2. Click **"Add endpoint"**
3. Paste your webhook URL:
   ```
   https://cwkaqyxbughjtkbukliq.supabase.co/functions/v1/stripe-webhook
   ```
4. Click **"Select events"**
5. Search for and select: `checkout.session.completed`
6. Click **"Add endpoint"**

---

## Step 8: Get Webhook Signing Secret

After creating the endpoint:

1. Click on your newly created webhook endpoint
2. Find **"Signing secret"** section
3. Click **"Reveal"** button
4. Copy the secret (starts with `whsec_...`)

---

## Step 9: Set Webhook Secret

Set the webhook secret:

```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
```

**Example:**
```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_abc123def456...
```

---

## Step 10: Verify All Secrets Are Set

Check that all secrets are configured:

```bash
supabase secrets list
```

You should see:
- ✅ `STRIPE_SECRET_KEY`
- ✅ `STRIPE_WEBHOOK_SECRET`
- ✅ `SUPABASE_URL`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`

---

## Step 11: Test the Webhook!

1. Go to your pricing page
2. Click "Start Free Trial" on any plan
3. Complete payment with test card: `4242 4242 4242 4242`
4. Check Stripe Dashboard → Webhooks → Your endpoint → **"Recent events"**
   - You should see a green ✅ `checkout.session.completed` event
5. Check your Supabase `subscriptions` table - subscription should be there!

---

## Troubleshooting

### Webhook Not Receiving Events

**Check Stripe Dashboard:**
- Go to Webhooks → Your endpoint → Recent events
- Click on an event to see the response
- If there's an error, it will show the error message

**Check Supabase Logs:**
```bash
supabase functions logs stripe-webhook --tail
```

### Subscription Not Saving

**Check if metadata is being sent:**
- The checkout session must include metadata with `planId`, `interval`, and `userId`
- Check that the Edge Function (`create-subscription-intent`) is setting metadata

**Check logs:**
```bash
supabase functions logs stripe-webhook
```

Look for:
- ✅ `Subscription saved successfully via webhook`
- ❌ Error messages

### "User ID is anonymous" Error

This means the checkout session was created without a user ID. Check:
1. User is logged in when clicking "Start Free Trial"
2. `createSubscriptionIntent` is called with `userId: user?.id`
3. Check `components/Pricing.tsx` line 131

---

## Next Steps

Once the webhook is working:

1. ✅ Subscriptions will be automatically saved
2. ✅ No need to rely on URL parameters
3. ✅ More reliable than redirect-based saving
4. ✅ Works even if user closes browser after payment

---

## Quick Command Reference

```bash
# Link project
supabase link --project-ref cwkaqyxbughjtkbukliq

# Set all secrets
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set SUPABASE_URL=https://cwkaqyxbughjtkbukliq.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# Deploy
supabase functions deploy stripe-webhook

# Check logs
supabase functions logs stripe-webhook --tail

# List secrets
supabase secrets list
```

---

**Ready to start? Let's go through each step together!** 🚀

