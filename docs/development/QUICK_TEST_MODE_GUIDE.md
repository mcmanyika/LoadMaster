# 🚀 Quick Guide: Create Test Payment Links (5 Minutes)

## ✅ The Problem
Your Payment Links are in **LIVE mode**, so test cards don't work.

## ✅ The Solution
Create new Payment Links in **TEST mode**.

---

## Step-by-Step Instructions

### 1️⃣ Switch to Test Mode

1. Go to: https://dashboard.stripe.com
2. Look at **top right corner**
3. Click the toggle to switch from "Live mode" → **"Test mode"**
4. Page reloads - you'll see orange/yellow indicators

✅ **Make sure you see "Test mode" in the top right!**

---

### 2️⃣ Create Products (Skip if you already have them)

**Product 1: LoadMaster Essential**
1. Click **"Products"** in left sidebar
2. Click **"+ Add product"**
3. Name: `LoadMaster Essential`
4. Click **"Save product"**

**Product 2: LoadMaster Professional**
1. Click **"+ Add product"** again
2. Name: `LoadMaster Professional`
3. Click **"Save product"**

---

### 3️⃣ Add Prices to Products

**For LoadMaster Essential:**

1. Click on **"LoadMaster Essential"** product
2. Click **"Add price"**
3. Set:
   - **Price:** `$99.00`
   - **Billing:** Monthly (recurring)
   - Click **"Add price"**
4. Click **"Add price"** again
5. Set:
   - **Price:** `$85.00` (or $1,020/year)
   - **Billing:** Monthly (billed annually) OR Yearly
   - Click **"Add price"**

**For LoadMaster Professional:**

1. Click on **"LoadMaster Professional"** product
2. Click **"Add price"**
3. Set:
   - **Price:** `$199.00`
   - **Billing:** Monthly (recurring)
   - Click **"Add price"**
4. Click **"Add price"** again
5. Set:
   - **Price:** `$170.00` (or $2,040/year)
   - **Billing:** Monthly (billed annually) OR Yearly
   - Click **"Add price"**

---

### 4️⃣ Create Payment Links

**Option A: From Payment Links Page**
1. Click **"Payment Links"** in left sidebar
2. Click **"Create payment link"**
3. Select product and price
4. Click **"Create payment link"**
5. Copy the URL

**Option B: From Product Page**
1. Click on a product
2. Find the price you want
3. Click **"Create payment link"** next to the price
4. Copy the URL

**Create these 4 Payment Links:**

| Plan | Price | What to Select |
|------|-------|----------------|
| Essential Monthly | $99/month | LoadMaster Essential → Monthly price |
| Essential Annual | $85/month | LoadMaster Essential → Annual price |
| Professional Monthly | $199/month | LoadMaster Professional → Monthly price |
| Professional Annual | $170/month | LoadMaster Professional → Annual price |

---

### 5️⃣ Update Your Code

Open `services/paymentLinksService.ts` and replace the URLs:

```typescript
export const STRIPE_PAYMENT_LINKS = {
  essential: {
    monthly: 'PASTE_YOUR_TEST_LINK_HERE', // Essential Monthly
    annual: 'PASTE_YOUR_TEST_LINK_HERE',  // Essential Annual
  },
  professional: {
    monthly: 'PASTE_YOUR_TEST_LINK_HERE', // Professional Monthly
    annual: 'PASTE_YOUR_TEST_LINK_HERE',  // Professional Annual
  },
};
```

**The links should look like:**
```
https://buy.stripe.com/test_abc123...
```

---

### 6️⃣ Test It!

1. Go to your pricing page
2. Click **"Start Free Trial"**
3. You'll be redirected to Stripe checkout
4. Use test card: `4242 4242 4242 4242`
5. Expiry: `12/26` (any future date)
6. CVC: `123` (any 3 digits)
7. Click **"Subscribe"**
8. ✅ Should work!

---

## 🎯 Quick Reference

**Test Cards:**
- ✅ Success: `4242 4242 4242 4242`
- ❌ Decline: `4000 0000 0000 0002`

**Important:**
- Make sure you're in **Test Mode** (top right of Stripe Dashboard)
- Copy the **Payment Link URLs** (not Price IDs)
- Update `services/paymentLinksService.ts` with test links

---

## 🆘 Troubleshooting

**"Still getting live mode error?"**
- Double-check you're in Test Mode (top right corner)
- Make sure you created the Payment Links while in Test Mode
- Try creating new Payment Links

**"Where do I find Payment Links?"**
- Left sidebar → "Payment Links"
- OR: Click on a product → scroll to prices → "Create payment link"

**"Can't find where to create links?"**
- In Stripe Dashboard, search for "Payment Links" in the search bar
- OR: Go to Products → Click a product → Look for "Create payment link" button

---

Need help with a specific step? Let me know which step you're on!

