# 🔧 Fix: Edge Function Payment Data Not Captured

## The Problem

After using the Edge Function, payment goes through but subscription data isn't saved.

## Issues Found

1. ✅ **Checkout Sessions use `session_id`, not `payment_intent`** - Fixed in App.tsx
2. ⚠️ **Success URL format** - Need to verify Stripe replaces `{CHECKOUT_SESSION_ID}` correctly
3. ⚠️ **User authentication timing** - User must be loaded when redirect happens

## What Was Fixed

### 1. App.tsx Detection Logic ✅

Changed from checking `paymentIntentId` first to checking `sessionId` first (Checkout Sessions).

### 2. Edge Function Success URL ✅

The Edge Function correctly uses:
```typescript
session_id={CHECKOUT_SESSION_ID}
```

Stripe automatically replaces `{CHECKOUT_SESSION_ID}` with the actual session ID.

## What to Check After Payment

1. **Browser URL after redirect:**
   - Should be: `/?payment=success&plan=essential&interval=month&session_id=cs_xxx`
   - Check if `session_id` is present

2. **Browser Console (F12):**
   - Look for: `🔍 Payment redirect detected. URL params: {...}`
   - Check what `sessionId` shows
   - Check if `plan` and `interval` are present

3. **User Authentication:**
   - Make sure you're logged in when completing payment
   - Check console for user ID

4. **Save Attempt:**
   - Look for: `🔄 Attempting to save subscription from Checkout Session: {...}`
   - Check for errors: `❌ Failed to save subscription: ...`

## Next Steps

1. Try payment again
2. Check browser console for the debug messages
3. Share what you see in the console - this will help identify the exact issue

## If Still Not Working

Check these:

1. **Is the `session_id` parameter in the URL?**
   - After payment, look at browser URL bar
   - Should have `&session_id=cs_xxx`

2. **Are `plan` and `interval` in the URL?**
   - Should have `&plan=essential&interval=month`

3. **Is user authenticated?**
   - Check console for user object
   - Must be logged in for save to work

4. **Check Supabase table:**
   - Go to Table Editor
   - Check if `subscriptions` table exists
   - Check for any error in browser console about table not found

