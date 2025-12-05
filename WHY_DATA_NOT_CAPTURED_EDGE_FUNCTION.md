# 🔍 Why Subscription Data Isn't Being Captured (Edge Function)

## The Problem

Payment goes through successfully, but subscription data isn't being saved to Supabase.

## What to Check RIGHT NOW

### Step 1: Browser Console After Payment

After completing payment, immediately open browser console (F12) and check for:

```
🔍 Payment redirect detected. URL params: {...}
```

**What to look for:**
- `payment: 'success'` ✅
- `plan: 'essential'` or `'professional'` ✅
- `interval: 'month'` or `'year'` ✅
- `sessionId: 'cs_xxx...'` ✅
- `user: { id: 'xxx', ... }` ✅

**If any are missing/null, that's the issue!**

### Step 2: Check Browser URL

Look at the address bar after payment. Should be:
```
http://localhost:3000/?payment=success&plan=essential&interval=month&session_id=cs_xxx
```

### Step 3: Check for Save Attempt

Look in console for:
```
🔄 Attempting to save subscription from Checkout Session: {...}
```

Then either:
- ✅ `✅ Subscription saved successfully!`
- ❌ `❌ Failed to save subscription: ...`

## Common Issues & Fixes

### Issue 1: User Not Authenticated ⚠️ MOST COMMON

**Problem:** User must be logged in when payment completes.

**Check:**
- Are you logged in before clicking "Start Free Trial"?
- Check console for user object

**Fix:** Log in first, then make payment.

### Issue 2: Missing URL Parameters

**Problem:** `plan` or `interval` not in redirect URL.

**Check:**
- Browser URL after redirect
- Console log shows `plan: null` or `interval: null`

**Fix:** 
- Check Edge Function logs in Supabase Dashboard
- Verify success_url includes plan and interval

### Issue 3: session_id Missing

**Problem:** Stripe not appending session_id to redirect.

**Check:**
- Browser URL doesn't have `&session_id=cs_xxx`
- Console shows `sessionId: null`

**Fix:**
- Edge Function uses `{CHECKOUT_SESSION_ID}` placeholder
- Stripe should replace it automatically
- Check Edge Function logs for errors

### Issue 4: Database Error

**Problem:** Error saving to Supabase.

**Check:**
- Console shows `❌ Failed to save subscription: ...`
- Check error message

**Common errors:**
- "table does not exist" → Run migration
- Permission error → Check RLS policies
- User ID error → Check authentication

## Code Flow

1. User clicks "Start Free Trial"
2. Frontend calls Edge Function
3. Edge Function creates Checkout Session
4. User redirected to Stripe
5. User completes payment
6. Stripe redirects back with: `?payment=success&plan=xxx&interval=xxx&session_id=cs_xxx`
7. App detects redirect and saves subscription

**The save only happens if:**
- ✅ User is authenticated
- ✅ URL has `payment=success`
- ✅ URL has `plan` and `interval`
- ✅ URL has `session_id`
- ✅ All conditions met simultaneously

## Quick Test

1. **Make sure you're logged in**
2. Go to Pricing page
3. Click "Start Free Trial"
4. Complete payment
5. **Immediately check browser console (F12)**
6. Share the `🔍 Payment redirect detected` log output

This will show exactly what's missing!

