# Step-by-Step: Create Test Mode Payment Links

Follow these exact steps to create test Payment Links:

## Step 1: Switch to Test Mode in Stripe

1. Go to **https://dashboard.stripe.com**
2. Look at the **top right corner** of the page
3. You'll see a toggle that says **"Live mode"** or **"Test mode"**
4. **Click the toggle** to switch to **"Test mode"**
5. The page will reload - you should see orange/yellow colors indicating test mode
6. ✅ Confirm you're in Test Mode (top right should say "Test mode")

---

## Step 2: Create Products (if you don't have them)

### Create "LoadMaster Essential" Product:

1. In Stripe Dashboard (Test Mode), go to **Products**
2. Click **"+ Add product"** or **"Create product"**
3. Fill in:
   - **Name:** `LoadMaster Essential`
   - **Description:** `Perfect for small fleets - up to 50 loads/month`
   - Leave other fields as default
4. Click **"Save product"**

### Create "LoadMaster Professional" Product:

1. Click **"+ Add product"** again
2. Fill in:
   - **Name:** `LoadMaster Professional`
   - **Description:** `For growing fleets - up to 500 loads/month`
3. Click **"Save product"**

---

## Step 3: Create Prices for Essential Plan

### Essential Monthly Price:

1. Click on **"LoadMaster Essential"** product
2. Click **"Add price"** or **"+ Add another price"**
3. Configure:
   - **Pricing model:** Recurring
   - **Price:** `$99.00`
   - **Billing period:** Monthly
   - **Currency:** USD
4. Click **"Add price"**

### Essential Annual Price:

1. Still in "LoadMaster Essential" product
2. Click **"Add price"** again
3. Configure:
   - **Pricing model:** Recurring
   - **Price:** `$85.00` (monthly) OR `$1,020.00` (yearly)
   - **Billing period:** Monthly (billed annually) OR Yearly
   - **Currency:** USD
4. Click **"Add price"**

---

## Step 4: Create Prices for Professional Plan

### Professional Monthly Price:

1. Go to **"LoadMaster Professional"** product
2. Click **"Add price"**
3. Configure:
   - **Pricing model:** Recurring
   - **Price:** `$199.00`
   - **Billing period:** Monthly
4. Click **"Add price"**

### Professional Annual Price:

1. Still in "LoadMaster Professional" product
2. Click **"Add price"**
3. Configure:
   - **Pricing model:** Recurring
   - **Price:** `$170.00` (monthly) OR `$2,040.00` (yearly)
   - **Billing period:** Monthly (billed annually) OR Yearly
4. Click **"Add price"**

---

## Step 5: Create Payment Links

### Essential Monthly Payment Link:

1. Go to **Products** → **Payment Links** (or click on the product → "Create payment link")
2. Click **"Create payment link"** or **"+ New"**
3. Select:
   - **Product:** LoadMaster Essential
   - **Price:** Essential Monthly ($99/month)
   - **Customer email:** Optional (leave blank or set)
4. Click **"Create payment link"**
5. **Copy the Payment Link URL** (looks like: `https://buy.stripe.com/...`)
6. ✅ Save this URL - you'll need it!

### Essential Annual Payment Link:

1. Click **"Create payment link"** again
2. Select:
   - **Product:** LoadMaster Essential
   - **Price:** Essential Annual ($85/month or $1,020/year)
3. Click **"Create payment link"**
4. **Copy the Payment Link URL**

### Professional Monthly Payment Link:

1. Click **"Create payment link"**
2. Select:
   - **Product:** LoadMaster Professional
   - **Price:** Professional Monthly ($199/month)
3. Click **"Create payment link"**
4. **Copy the Payment Link URL**

### Professional Annual Payment Link:

1. Click **"Create payment link"**
2. Select:
   - **Product:** LoadMaster Professional
   - **Price:** Professional Annual ($170/month or $2,040/year)
3. Click **"Create payment link"**
4. **Copy the Payment Link URL**

---

## Step 6: Update Your Code

Open `services/paymentLinksService.ts` and replace the links:

```typescript
export const STRIPE_PAYMENT_LINKS = {
  essential: {
    monthly: 'PASTE_ESSENTIAL_MONTHLY_LINK_HERE',
    annual: 'PASTE_ESSENTIAL_ANNUAL_LINK_HERE',
  },
  professional: {
    monthly: 'PASTE_PROFESSIONAL_MONTHLY_LINK_HERE',
    annual: 'PASTE_PROFESSIONAL_ANNUAL_LINK_HERE',
  },
};
```

---

## Quick Checklist

- [ ] Switched to Test Mode in Stripe Dashboard
- [ ] Created "LoadMaster Essential" product
- [ ] Created "LoadMaster Professional" product
- [ ] Created Essential Monthly price ($99/month)
- [ ] Created Essential Annual price ($85/month or $1,020/year)
- [ ] Created Professional Monthly price ($199/month)
- [ ] Created Professional Annual price ($170/month or $2,040/year)
- [ ] Created Essential Monthly Payment Link
- [ ] Created Essential Annual Payment Link
- [ ] Created Professional Monthly Payment Link
- [ ] Created Professional Annual Payment Link
- [ ] Copied all 4 Payment Link URLs
- [ ] Updated `services/paymentLinksService.ts` with test links

---

## Visual Guide

**Where to find things:**

1. **Test Mode Toggle:** Top right corner of Stripe Dashboard
2. **Products:** Left sidebar → "Products"
3. **Payment Links:** Left sidebar → "Payment Links" OR within a product page
4. **Create Payment Link:** Big button that says "Create payment link"

---

## Need More Help?

If you get stuck at any step, let me know which step you're on and I can help!

