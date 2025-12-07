# 🎯 START HERE: Create Test Payment Links (5 Minutes)

Follow these steps in order:

---

## ⚠️ FIRST: Switch to Test Mode

1. Open: https://dashboard.stripe.com
2. Look at **TOP RIGHT CORNER**
3. See a toggle? Click it to switch from **"Live mode"** → **"Test mode"**
4. ✅ You should see "Test mode" in the top right now!

---

## 📝 What You Need to Create

You need **4 Payment Links**:

1. Essential Monthly ($99/month)
2. Essential Annual ($85/month = $1,020/year)
3. Professional Monthly ($199/month)
4. Professional Annual ($170/month = $2,040/year)

---

## 🚀 Step-by-Step Process

### Step 1: Create Products (2 minutes)

**Product 1:**

- Go to **Products** (left sidebar)
- Click **"+ Add product"**
- Name: `LoadMaster Essential`
- Click **"Save product"**

**Product 2:**

- Click **"+ Add product"** again
- Name: `LoadMaster Professional`
- Click **"Save product"**

---

### Step 2: Add Prices (3 minutes)

**For "LoadMaster Essential" product:**

1. Click on **"LoadMaster Essential"**
2. Click **"Add price"** button
3. Set:
   - Amount: `$99.00`
   - Billing: **Monthly** (recurring)
   - Click **"Add price"**
4. Click **"Add price"** again
5. Set:
   - Amount: `$85.00` (or $1,020 if yearly)
   - Billing: **Monthly (billed annually)** OR **Yearly**
   - Click **"Add price"**

**For "LoadMaster Professional" product:**

1. Click on **"LoadMaster Professional"**
2. Click **"Add price"**
3. Set: `$199.00` / **Monthly**
4. Click **"Add price"**
5. Click **"Add price"** again
6. Set: `$170.00` (or $2,040 if yearly) / **Monthly (billed annually)** OR **Yearly**

---

### Step 3: Create Payment Links (2 minutes)

**Easy way - From Product Page:**

1. Click on **"LoadMaster Essential"** product
2. You'll see 2 prices listed
3. Next to each price, click **"Create payment link"**
4. Click **"Create payment link"** (confirm)
5. **Copy the URL** that appears (looks like: `https://buy.stripe.com/...`)
6. ✅ Save this URL somewhere (notepad, etc.)

Repeat for **"LoadMaster Professional"**:

- Click on the product
- Create payment link for monthly price → Copy URL
- Create payment link for annual price → Copy URL

**You should now have 4 URLs:**

- Essential Monthly URL
- Essential Annual URL
- Professional Monthly URL
- Professional Annual URL

---

### Step 4: Update Your Code (1 minute)

Open `services/paymentLinksService.ts` and replace the URLs:

```typescript
export const STRIPE_PAYMENT_LINKS = {
  essential: {
    monthly: "PASTE_ESSENTIAL_MONTHLY_URL_HERE",
    annual: "PASTE_ESSENTIAL_ANNUAL_URL_HERE",
  },
  professional: {
    monthly: "PASTE_PROFESSIONAL_MONTHLY_URL_HERE",
    annual: "PASTE_PROFESSIONAL_ANNUAL_URL_HERE",
  },
};
```

Replace `PASTE_..._HERE` with your actual URLs!

---

### Step 5: Test It! (30 seconds)

1. Go to your app's pricing page
2. Click **"Start Free Trial"**
3. You'll be redirected to Stripe checkout
4. Enter test card: `4242 4242 4242 4242`
5. Expiry: `12/26` (any future date)
6. CVC: `123`
7. Click **"Subscribe"**
8. ✅ Should work without errors!

---

## 🆘 Need Help?

**"I can't find where to create payment links"**

- Click on a Product → Scroll down → See prices → Click "Create payment link" next to each price

**"Still getting live mode error"**

- Make sure you're in **Test Mode** (check top right corner)
- Make sure you created the Payment Links while in Test Mode
- Try creating new Payment Links

**"Where are my Payment Links?"**

- After creating, the URL appears in a popup/modal
- OR: Go to **Payment Links** in left sidebar to see all your links

---

## ✅ Checklist

- [ ] Switched Stripe Dashboard to Test Mode
- [ ] Created "LoadMaster Essential" product
- [ ] Created "LoadMaster Professional" product
- [ ] Added Essential Monthly price ($99)
- [ ] Added Essential Annual price ($85 or $1,020)
- [ ] Added Professional Monthly price ($199)
- [ ] Added Professional Annual price ($170 or $2,040)
- [ ] Created Essential Monthly Payment Link → Copied URL
- [ ] Created Essential Annual Payment Link → Copied URL
- [ ] Created Professional Monthly Payment Link → Copied URL
- [ ] Created Professional Annual Payment Link → Copied URL
- [ ] Updated `services/paymentLinksService.ts` with all 4 URLs
- [ ] Tested with card `4242 4242 4242 4242` → ✅ Works!

---

**Ready? Start with Step 1!** 🚀
