# 🔍 Debug: Payment Data Not Being Captured

## The Problem

Payment goes through successfully, but subscription data isn't being saved to Supabase.

## Critical Checks

### 1. After Payment, Check Browser Console (F12)

Open console immediately after payment redirect and look for:

```
🔍 Payment redirect detected. URL params: {
  payment: 'success',
  plan: 'essential',      ← Should exist
  interval: 'month',      ← Should exist
  sessionId: 'cs_xxx...', ← Should exist
  ...
}
```

**If any of these are missing, that's the issue!**

### 2. Check Browser URL After Redirect

Look at the address bar. It should show:

```
http://localhost:3000/?payment=success&plan=essential&interval=month&session_id=cs_xxx
```

**Check for:**

- ✅ `payment=success`
- ✅ `plan=essential` (or professional)
- ✅ `interval=month` (or year)
- ✅ `session_id=cs_xxx...`

### 3. Check User Authentication

**CRITICAL:** The save only works if user is authenticated!

Check console for:

- Is user loaded? (Should see user object in logs)
- Does `user.id` exist?

**If user is null:**

- Must log in BEFORE making payment
- The redirect happens after payment, so user must already be authenticated

### 4. Check Save Attempt Logs

Look for these messages in console:

```
🔄 Attempting to save subscription from Checkout Session: {
  userId: 'xxx',
  plan: 'essential',
  interval: 'month',
  amount: 12.49,
  sessionId: 'cs_xxx'
}
```

Then either:

- ✅ `✅ Subscription saved successfully!`
- ❌ `❌ Failed to save subscription: ...` (with error details)

### 5. Check Database Errors

If you see `❌ Failed to save subscription: ...`, check:

- Is the `subscriptions` table created? (Run migration if not)
- Are there any permission errors?
- Check the error message for details

## Most Common Issues

### Issue 1: User Not Authenticated ⚠️ MOST COMMON

**Symptom:** Payment succeeds but no save attempt in console

**Fix:** Make sure you're logged in BEFORE clicking "Start Free Trial"

### Issue 2: Missing URL Parameters

**Symptom:** Console shows `plan` or `interval` as `null`

**Possible causes:**

- Edge Function success_url not formatted correctly
- Stripe not preserving query parameters

**Fix:** Check Edge Function logs in Supabase Dashboard

### Issue 3: session_id Missing

**Symptom:** Console shows `sessionId: null`

**Possible causes:**

- Stripe not appending session_id to redirect URL
- Wrong redirect URL format

**Fix:** The Edge Function uses `{CHECKOUT_SESSION_ID}` which Stripe should replace. Check Edge Function logs.

### Issue 4: Database Table Missing

**Symptom:** Error says "table does not exist"

**Fix:** Run the migration:

```sql
-- In Supabase SQL Editor
-- File: supabase_migrations/003_create_subscriptions_table.sql
```

## Quick Debug Commands

Run these in browser console after payment:

```javascript
// Check URL params
const params = new URLSearchParams(window.location.search);
console.log("Payment:", params.get("payment"));
console.log("Plan:", params.get("plan"));
console.log("Interval:", params.get("interval"));
console.log("Session ID:", params.get("session_id"));

// Check localStorage
console.log("Pending Payment:", localStorage.getItem("pending_payment"));
console.log(
  "Pending Subscription:",
  localStorage.getItem("pending_subscription")
);
```

## What to Share

If still not working, share:

1. **Browser console output** - The `🔍 Payment redirect detected` log
2. **Browser URL** - Copy the full URL after redirect
3. **Any error messages** - From console
4. **User authentication status** - Are you logged in?

This will help identify the exact issue!
