# 🔍 Debug: Edge Function Payment Not Capturing Data

## Issues Found

1. **Checkout Sessions use `session_id`, not `payment_intent`** - The App.tsx is checking for `paymentIntentId` first, but Checkout Sessions return `session_id`
2. **Success URL format** - Need to ensure Stripe replaces `{CHECKOUT_SESSION_ID}` correctly
3. **User authentication timing** - User must be loaded before subscription save

## What to Check

1. **After payment, check browser URL:**
   - Should have: `?payment=success&plan=essential&interval=month&session_id=cs_xxx`
   - Check what parameters are actually present

2. **Check browser console:**
   - Look for: `🔍 Payment redirect detected. URL params: {...}`
   - See what `sessionId` value is
   - Check if `plan` and `interval` are present

3. **Check if user is loaded:**
   - The save only happens if `user` exists
   - Check console for user authentication status

## Likely Issues

1. App.tsx is checking for `paymentIntentId` but Checkout Sessions use `session_id`
2. The success URL might not be correctly formatted
3. User might not be authenticated when redirect happens

