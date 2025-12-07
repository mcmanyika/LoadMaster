# Stripe Payment Links Setup - NO BACKEND REQUIRED! 🎉

This is the **easiest way** to accept payments - **no backend server needed!**

## What are Stripe Payment Links?

Payment Links are hosted checkout pages created directly in your Stripe Dashboard. Users click a button, get redirected to Stripe's secure checkout page, complete payment, and get redirected back. **Zero backend code required!**

## Step 1: Create Payment Links in Stripe Dashboard

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Products** → **Payment Links**
3. Click **Create payment link**

### Create Links for Each Plan:

#### Essential Monthly ($99/month)
- Product: "LoadMaster Essential" (create if doesn't exist)
- Price: $99/month (recurring)
- Copy the Payment Link URL (looks like: `https://buy.stripe.com/...`)

#### Essential Annual ($85/month billed annually = $1,020/year)
- Same product: "LoadMaster Essential"
- Price: $1,020/year (or $85/month with annual billing)
- Copy the Payment Link URL

#### Professional Monthly ($199/month)
- Product: "LoadMaster Professional" (create if doesn't exist)
- Price: $199/month (recurring)
- Copy the Payment Link URL

#### Professional Annual ($170/month billed annually = $2,040/year)
- Same product: "LoadMaster Professional"
- Price: $2,040/year (or $170/month with annual billing)
- Copy the Payment Link URL

## Step 2: Add Payment Links to Your Code

1. Open `services/paymentLinksService.ts`
2. Paste your Payment Link URLs:

```typescript
export const STRIPE_PAYMENT_LINKS: Record<string, { monthly: string; annual: string }> = {
  essential: {
    monthly: 'https://buy.stripe.com/your-essential-monthly-link',
    annual: 'https://buy.stripe.com/your-essential-annual-link',
  },
  professional: {
    monthly: 'https://buy.stripe.com/your-professional-monthly-link',
    annual: 'https://buy.stripe.com/your-professional-annual-link',
  },
};
```

## Step 3: Configure Success/Cancel URLs (IMPORTANT!)

**You MUST configure redirect URLs so customers come back to your site after payment!**

### Configure in Stripe Dashboard:

1. Go to **Payment Links** in Stripe Dashboard
2. Click on each Payment Link you created
3. Scroll to **"After payment"** section
4. Configure redirect URLs:

**For Development (localhost):**
- Success URL: `http://localhost:5173/?payment=success&plan=essential&interval=month`
- Cancel URL: `http://localhost:5173/?payment=cancelled`

**For Production:**
- Success URL: `https://yourdomain.com/?payment=success&plan=essential&interval=month`
- Cancel URL: `https://yourdomain.com/?payment=cancelled`

**Important:** Replace `plan=essential` with the actual plan for each link:
- Essential Monthly: `plan=essential&interval=month`
- Essential Annual: `plan=essential&interval=year`
- Professional Monthly: `plan=professional&interval=month`
- Professional Annual: `plan=professional&interval=year`

**See `PAYMENT_REDIRECT_SETUP.md` for detailed instructions!**

## Step 4: That's It! ✅

Now when users click "Start Free Trial", they'll be redirected to Stripe's secure checkout page. **No backend needed!**

---

## Advantages of Payment Links

✅ **No backend server required**
✅ **No API endpoints to maintain**
✅ **Stripe handles everything securely**
✅ **PCI compliance handled by Stripe**
✅ **Works immediately**
✅ **Professional checkout experience**

## Limitations

- Less customization than custom checkout
- Can't pre-fill customer email (users enter it on Stripe's page)
- Less control over the checkout flow

## Testing

Use Stripe test cards:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Use any future expiry date and any 3-digit CVC

---

## Alternative: Stripe Checkout (Still needs backend)

If you need more customization, you can use Stripe Checkout Sessions, but this requires a backend server to create the sessions. See `STRIPE_SETUP.md` for that approach.

