# ✅ Webhook Deployed! Next Steps

Your webhook function has been successfully deployed! 🎉

## Your Webhook URL

```
https://cwkaqyxbughjtkbukliq.supabase.co/functions/v1/stripe-webhook
```

## Next Steps

### Step 1: Configure Webhook in Stripe Dashboard

1. **Go to Stripe Dashboard:**
   - https://dashboard.stripe.com/test/webhooks

2. **Click "Add endpoint"**

3. **Enter your webhook URL:**
   ```
   https://cwkaqyxbughjtkbukliq.supabase.co/functions/v1/stripe-webhook
   ```

4. **Click "Select events"**

5. **Search and select:**
   - ✅ `checkout.session.completed`

6. **Click "Add endpoint"**

### Step 2: Get Webhook Signing Secret

After creating the endpoint:

1. **Click on your newly created webhook endpoint** (in the list)

2. **Find "Signing secret" section**

3. **Click "Reveal" button**

4. **Copy the secret** (it starts with `whsec_...`)

### Step 3: Set Webhook Secret

Run this command (replace `whsec_...` with your actual secret):

```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
```

**Example:**
```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_abc123def456ghi789...
```

### Step 4: Test It!

1. Go to your pricing page: http://localhost:3000
2. Click "Start Free Trial" on any plan
3. Complete payment with test card:
   - Card: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., `12/25`)
   - CVC: Any 3 digits (e.g., `123`)
   - ZIP: Any 5 digits (e.g., `12345`)
4. After payment, check:
   - ✅ Stripe Dashboard → Webhooks → Your endpoint → "Recent events"
     - Should show green ✅ `checkout.session.completed` event
   - ✅ Your Supabase `subscriptions` table
     - Should have a new subscription record!

---

## What's Already Set Up ✅

- ✅ Webhook function deployed
- ✅ STRIPE_SECRET_KEY configured
- ✅ SUPABASE_URL configured  
- ✅ SUPABASE_SERVICE_ROLE_KEY configured
- ✅ Checkout session includes metadata (planId, interval, userId)

## What You Need to Do

1. ⏳ Configure webhook endpoint in Stripe Dashboard (Step 1 above)
2. ⏳ Get webhook signing secret (Step 2 above)
3. ⏳ Set webhook secret (Step 3 above)
4. ⏳ Test it! (Step 4 above)

---

## Troubleshooting

### If webhook events show errors:

Check logs:
```bash
supabase functions logs stripe-webhook --tail
```

### If subscription not saving:

1. Check Stripe Dashboard → Webhooks → Your endpoint → Click on event
   - Look at the response - it will show any errors
2. Make sure the checkout session includes metadata:
   - `planId`
   - `interval`
   - `userId`

---

**Once you've completed Step 1-3, the webhook will automatically save all subscriptions!** 🚀

