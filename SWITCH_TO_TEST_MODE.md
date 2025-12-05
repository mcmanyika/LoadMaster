# Switch to Test Mode - Quick Guide

You're getting the error because your Payment Links are in **LIVE mode** but you're using **test cards**.

## Solution: Create Test Mode Payment Links

### Step 1: Switch Stripe Dashboard to Test Mode

1. Go to https://dashboard.stripe.com
2. Look at the **top right corner** - you'll see "Live mode" or "Test mode"
3. Click the toggle to switch to **"Test mode"**
4. The dashboard will reload and show test mode (orange/yellow indicator)

### Step 2: Create New Payment Links in Test Mode

While in **Test Mode**:

1. Go to **Products** → **Payment Links**
2. Click **"Create payment link"**

Create these 4 Payment Links:

#### Essential Monthly
- Product: "LoadMaster Essential" (or create new)
- Price: $99/month (recurring subscription)
- Copy the Payment Link URL

#### Essential Annual  
- Product: "LoadMaster Essential"
- Price: $1,020/year (or $85/month billed annually)
- Copy the Payment Link URL

#### Professional Monthly
- Product: "LoadMaster Professional"
- Price: $199/month (recurring subscription)
- Copy the Payment Link URL

#### Professional Annual
- Product: "LoadMaster Professional"
- Price: $2,040/year (or $170/month billed annually)
- Copy the Payment Link URL

### Step 3: Update Your Code

Replace the Payment Links in `services/paymentLinksService.ts` with your **TEST mode** links:

```typescript
export const STRIPE_PAYMENT_LINKS = {
  essential: {
    monthly: 'https://buy.stripe.com/test-essential-monthly-link',
    annual: 'https://buy.stripe.com/test-essential-annual-link',
  },
  professional: {
    monthly: 'https://buy.stripe.com/test-professional-monthly-link',
    annual: 'https://buy.stripe.com/test-professional-annual-link',
  },
};
```

### Step 4: Test It!

1. Click "Start Free Trial" on your pricing page
2. Use test card: `4242 4242 4242 4242`
3. Expiry: Any future date (e.g., 12/26)
4. CVC: Any 3 digits (e.g., 123)
5. Should work! ✅

---

## How to Tell Test vs Live Mode

**Test Mode Links:**
- Created while Dashboard shows "Test mode"
- Work with test cards like `4242 4242 4242 4242`
- No real money is charged

**Live Mode Links:**
- Created while Dashboard shows "Live mode"
- Only work with real credit cards
- Real money is charged

---

## Quick Test Cards

- ✅ **Success:** `4242 4242 4242 4242`
- ❌ **Decline:** `4000 0000 0000 0002`
- 🔒 **3D Secure:** `4000 0025 0000 3155`

Use any future expiry date and any 3-digit CVC.

---

**Note:** Your current Payment Links in `paymentLinksService.ts` are in LIVE mode. You need to create new ones in TEST mode for development/testing.
