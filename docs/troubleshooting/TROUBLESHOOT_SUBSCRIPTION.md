# 🔍 Troubleshoot: Subscription Not Saved

## Most Likely Issue: Database Migration Not Run

The subscription wasn't saved because the **`subscriptions` table doesn't exist** in your Supabase database yet!

## ✅ Quick Fix Steps:

### Step 1: Check Browser Console

1. Open browser console (F12)
2. Look for error messages like:
   - `❌ Error saving subscription to database: ...`
   - `Subscriptions table not found...`
   - `relation 'subscriptions' does not exist`

### Step 2: Check if Migration Was Run

1. Go to **Supabase Dashboard**
2. Click **Table Editor** (left sidebar)
3. Look for a table named **`subscriptions`**

**If the table doesn't exist → Run the migration!**

### Step 3: Run the Database Migration

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Open file: `supabase_migrations/003_create_subscriptions_table.sql`
3. **Copy ALL the SQL code** (all 75 lines)
4. Paste into SQL Editor
5. Click **"Run"** button

### Step 4: Verify Table Was Created

After running migration, go back to **Table Editor** and check:
- ✅ `subscriptions` table exists
- ✅ Has columns: `id`, `user_id`, `plan`, `interval`, `status`, `amount`, etc.

### Step 5: Test Again

1. Make a test payment
2. Check browser console - should see: `✅ Subscription saved successfully!`
3. Go to "My Subscriptions" page - should see your subscription!

## 🔍 Other Possible Issues:

### Issue 2: Supabase Not Configured

Check if Supabase is configured:
- Look for error: `Supabase not configured, skipping subscription save`
- Make sure Supabase credentials are set in `.env.local`

### Issue 3: Missing URL Parameters

After payment, check the URL has:
```
/?payment=success&plan=essential&interval=month
```

If `plan` or `interval` are missing, subscription won't save.

### Issue 4: User Not Loaded

If user isn't authenticated when payment completes, auto-save will skip.
- Check if you're logged in
- Check browser console for user-related errors

## 🛠️ Manual Save (If Auto-Save Failed)

If auto-save failed, check localStorage:
1. Open browser console (F12)
2. Type: `localStorage.getItem('pending_subscription')`
3. If data exists, we can manually save it

## 📊 Check Database Directly

1. Go to **Supabase Dashboard** → **Table Editor**
2. Click on `subscriptions` table
3. Check if any rows exist
4. If empty, the subscription wasn't saved

## 🆘 Still Not Working?

Share:
1. Browser console errors (F12 → Console tab)
2. Whether `subscriptions` table exists in Supabase
3. URL after payment redirect
4. Any error messages you see

I'll help you fix it!

