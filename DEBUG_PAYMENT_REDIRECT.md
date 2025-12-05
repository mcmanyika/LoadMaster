# 🔍 Debug: Payment Redirect & Data Capture

## The Problem

Stripe Payment Links redirect back to your site, but **they don't automatically pass payment data** in the URL query parameters.

## What Stripe Payment Links Actually Send Back

When using Payment Links, Stripe redirects to the URL you configure, but:
- ❌ Does NOT automatically append `session_id` to the URL
- ❌ Does NOT automatically append `checkout_session_id` to the URL  
- ✅ Only redirects to the exact URL you configure in Stripe Dashboard

## Current Setup

Your code expects these URL parameters:
```
/?payment=success&plan=essential&interval=month&session_id=xxx
```

But Stripe Payment Links only redirect to:
```
/?payment=success&plan=essential&interval=month
```
(Without session_id unless you manually configure it)

## Solutions

### Option 1: Configure Redirect URLs in Stripe Dashboard (Recommended)

Set the redirect URLs directly in Stripe Dashboard to include all parameters:

1. Go to Stripe Dashboard → Payment Links
2. Edit each Payment Link
3. Set Success URL to:
   ```
   http://localhost:3000/?payment=success&plan=essential&interval=month
   ```
4. Make sure `plan` and `interval` match the payment link

### Option 2: Use Stripe Session ID from URL (If Available)

Some Payment Links might include session_id in the redirect. Check the actual redirect URL.

### Option 3: Use Webhooks (Most Reliable)

Set up Stripe webhooks to capture payment events and save subscriptions automatically.

---

## Quick Check

1. **After payment, check the actual URL:**
   - What does the browser URL bar show?
   - Does it have `?payment=success&plan=...&interval=...`?

2. **Check browser console (F12):**
   - Look for: `🔄 Attempting to save subscription: ...`
   - Look for errors: `❌ Error saving subscription...`

3. **Check localStorage:**
   - Type in console: `localStorage.getItem('pending_subscription')`
   - If data exists, subscription save failed

---

## Most Likely Issue

The redirect URL in Stripe Dashboard probably doesn't include the `plan` and `interval` parameters!

**Fix:** Update redirect URLs in Stripe Dashboard to include these parameters.

