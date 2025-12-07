# Payment Redirect Setup Guide

After a successful payment, Stripe will redirect customers back to your site's confirmation page.

## How It Works

1. Customer clicks "Start Free Trial" on your pricing page
2. Customer is redirected to Stripe's hosted checkout page
3. Customer completes payment
4. Stripe redirects back to your site with URL parameters
5. Your app shows a confirmation page

---

## Step 1: Configure Redirect URLs in Stripe Dashboard

### Option A: Configure in Payment Link Settings (Recommended)

1. Go to **Stripe Dashboard** → **Payment Links**
2. Click on a Payment Link you want to configure
3. Scroll to **"After payment"** section
4. Under **Confirmation page**, select:
   - **"Redirect to a website"** or **"Don't show a confirmation page"**
   - Enter your confirmation URL:
     ```
     https://yourdomain.com/?payment=success&plan=essential&interval=month
     ```
5. For **Cancel URL**, scroll to the bottom and configure where to redirect if payment is cancelled

### Option B: Edit Each Payment Link

For each of your 4 Payment Links:

**Essential Monthly:**
- Success URL: `https://yourdomain.com/?payment=success&plan=essential&interval=month`
- Cancel URL: `https://yourdomain.com/?payment=cancelled`

**Essential Annual:**
- Success URL: `https://yourdomain.com/?payment=success&plan=essential&interval=year`
- Cancel URL: `https://yourdomain.com/?payment=cancelled`

**Professional Monthly:**
- Success URL: `https://yourdomain.com/?payment=success&plan=professional&interval=month`
- Cancel URL: `https://yourdomain.com/?payment=cancelled`

**Professional Annual:**
- Success URL: `https://yourdomain.com/?payment=success&plan=professional&interval=year`
- Cancel URL: `https://yourdomain.com/?payment=cancelled`

---

## Step 2: Replace Your Domain

Replace `yourdomain.com` with your actual domain:

- **Local Development:** `http://localhost:5173`
- **Production:** `https://yourdomain.com`

---

## Step 3: URL Parameters Explained

When Stripe redirects back, it will append these parameters:

### Success Redirect:
```
/?payment=success&plan=essential&interval=month&session_id=cs_xxx
```

- `payment=success` - Indicates successful payment
- `plan=essential` - Which plan was purchased
- `interval=month` - Billing interval (month or year)
- `session_id=cs_xxx` - Stripe Checkout Session ID (optional, for verification)

### Cancel Redirect:
```
/?payment=cancelled
```

- `payment=cancelled` - Indicates payment was cancelled

---

## Step 4: Test the Redirect

1. Go to your pricing page
2. Click "Start Free Trial"
3. Complete payment with test card: `4242 4242 4242 4242`
4. After payment, you should be redirected back to your site
5. You should see the confirmation page! ✅

---

## Configuration in Stripe Dashboard - Detailed Steps

### Method 1: Edit Payment Link Settings

1. **Navigate to Payment Links:**
   - Stripe Dashboard → **Products** → **Payment Links**
   - OR: Stripe Dashboard → **Payment Links** (left sidebar)

2. **Select a Payment Link:**
   - Click on the Payment Link you want to edit

3. **Configure After Payment:**
   - Scroll down to **"After payment"** section
   - Click **"Edit"** or **"Configure"**

4. **Set Redirect URL:**
   - Choose: **"Redirect to a website"**
   - Enter your URL with parameters:
     ```
     https://yourdomain.com/?payment=success&plan=essential&interval=month
     ```

5. **Set Cancel URL:**
   - Scroll to cancellation settings
   - Enter cancel URL:
     ```
     https://yourdomain.com/?payment=cancelled
     ```

6. **Save Changes:**
   - Click **"Save"** or **"Update payment link"**

7. **Repeat for all 4 Payment Links:**
   - Essential Monthly
   - Essential Annual
   - Professional Monthly
   - Professional Annual

---

## Environment-Specific URLs

### Development (Local)
```
http://localhost:5173/?payment=success&plan=essential&interval=month
```

### Production
```
https://yourdomain.com/?payment=success&plan=essential&interval=month
```

### Staging
```
https://staging.yourdomain.com/?payment=success&plan=essential&interval=month
```

**Note:** You can create separate Payment Links for test and production, or use the same links and update the redirect URLs when deploying.

---

## Troubleshooting

### Issue: Not redirecting after payment

**Solution:**
- Check that redirect URLs are configured in Stripe Dashboard
- Make sure URLs are using `https://` (not `http://`) for production
- Verify the URLs are accessible and don't have typos

### Issue: Redirecting but no confirmation page

**Solution:**
- Check browser console for errors
- Verify URL parameters are being read correctly
- Check that `PaymentConfirmation` component is imported in `App.tsx`

### Issue: Session ID not being passed

**Solution:**
- Stripe may or may not pass session_id depending on configuration
- Check Stripe Dashboard Payment Link settings
- You can still show confirmation without session_id

---

## Quick Checklist

- [ ] Configured redirect URLs in Stripe Dashboard for all 4 Payment Links
- [ ] Used correct domain (localhost for dev, production domain for live)
- [ ] Tested payment flow end-to-end
- [ ] Confirmation page appears after successful payment
- [ ] Cancel redirect works correctly

---

## What Happens After Redirect?

1. **App loads** and checks URL parameters
2. **Detects** `payment=success` or `payment=cancelled`
3. **Shows** `PaymentConfirmation` component
4. **Displays** success message with plan details
5. **User clicks** "Continue to Dashboard" to proceed

The confirmation page automatically clears URL parameters from the browser history for a clean URL.

---

## Need Help?

If you're having trouble:
1. Check that redirect URLs are set in Stripe Dashboard
2. Verify your domain is correct
3. Test with a test card in test mode
4. Check browser console for errors

