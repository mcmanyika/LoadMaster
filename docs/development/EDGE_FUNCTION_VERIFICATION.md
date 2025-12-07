# ✅ Edge Function Payment Capture - Verification Guide

## The Issue

Payment goes through but subscription data isn't being saved to Supabase.

## What I Fixed

1. ✅ **Updated App.tsx** - Now properly detects Checkout Session `session_id` (not Payment Intent)
2. ✅ **Enhanced Edge Function** - Better logging and URL handling
3. ✅ **Improved error handling** - Better debugging output

## What to Check

### Step 1: After Payment, Check Browser Console (F12)

Look for these messages:

```
🔍 Payment redirect detected. URL params: {
  payment: 'success',
  plan: 'essential',
  interval: 'month',
  sessionId: 'cs_xxx...',  ← This should exist!
  ...
}
```

**If `sessionId` is `null` or missing:**
- The redirect URL isn't including the session_id
- Check the Edge Function success URL format

**If `plan` or `interval` are missing:**
- Check if localStorage has the data
- Look for: `📦 Retrieved plan/interval from localStorage: ...`

### Step 2: Check Browser URL After Redirect

The URL should look like:
```
http://localhost:3000/?payment=success&plan=essential&interval=month&session_id=cs_xxx
```

**Check for:**
- ✅ `payment=success`
- ✅ `plan=essential` (or professional)
- ✅ `interval=month` (or year)
- ✅ `session_id=cs_xxx...`

### Step 3: Check User Authentication

The save only works if user is authenticated. Check console for:
- Is user loaded? (Should see user object)
- Does `user.id` exist?

### Step 4: Check Save Attempt

Look for:
```
🔄 Attempting to save subscription from Checkout Session: {
  userId: 'xxx',
  plan: 'essential',
  interval: 'month',
  amount: 99,
  sessionId: 'cs_xxx'
}
```

Then either:
- ✅ `✅ Subscription saved successfully!`
- ❌ `❌ Failed to save subscription: ...`

### Step 5: Check Supabase Table

1. Go to Supabase Dashboard → Table Editor
2. Open `subscriptions` table
3. Check if new record appears
4. If not, check browser console for errors

## Common Issues & Fixes

### Issue 1: session_id Missing from URL

**Cause:** Stripe might not be appending session_id automatically

**Fix:** The Edge Function uses `{CHECKOUT_SESSION_ID}` placeholder which Stripe should replace. Verify the success_url format in Edge Function logs.

### Issue 2: plan/interval Missing

**Cause:** URL parameters not passed correctly

**Fix:** Check Edge Function creates success URL with plan and interval. Should see in logs:
```
Creating checkout session with redirect URLs: {
  successUrl: 'http://localhost:3000/?payment=success&plan=essential&interval=month&session_id={CHECKOUT_SESSION_ID}'
}
```

### Issue 3: User Not Authenticated

**Cause:** User not loaded when redirect happens

**Fix:** Make sure you're logged in before making payment. The save happens immediately after redirect, so user must be authenticated.

### Issue 4: Table Doesn't Exist

**Cause:** Migration not run

**Fix:** Run the migration:
```sql
-- Run in Supabase SQL Editor
-- File: supabase_migrations/003_create_subscriptions_table.sql
```

## Debug Commands

Run in browser console after payment:

```javascript
// Check URL params
console.log(new URLSearchParams(window.location.search).get('session_id'));
console.log(new URLSearchParams(window.location.search).get('plan'));
console.log(new URLSearchParams(window.location.search).get('interval'));

// Check localStorage
console.log(localStorage.getItem('pending_payment'));
console.log(localStorage.getItem('pending_subscription'));

// Check user
// (User should be visible in React DevTools or check auth state)
```

## Next Steps

1. Try payment again
2. Check browser console for all debug messages
3. Share what you see - especially:
   - The `🔍 Payment redirect detected` log
   - Any error messages
   - Whether `sessionId`, `plan`, `interval` are present

This will help identify the exact issue!

