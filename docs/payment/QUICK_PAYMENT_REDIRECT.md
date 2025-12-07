# Quick Guide: Payment Redirect Setup

After payment, customers should be redirected back to your confirmation page.

## ✅ What's Already Done

- ✅ PaymentConfirmation component created
- ✅ URL parameter detection in App.tsx
- ✅ Automatic redirect handling

## 🔧 What You Need to Do

Configure redirect URLs in your Stripe Payment Links.

### Quick Steps:

1. **Go to Stripe Dashboard** → **Payment Links**
2. **Click on each Payment Link** (you have 4 total)
3. **Find "After payment" section**
4. **Set Success URL:**
   - Development: `http://localhost:5173/?payment=success&plan=essential&interval=month`
   - Production: `https://yourdomain.com/?payment=success&plan=essential&interval=month`
5. **Set Cancel URL:**
   - Development: `http://localhost:5173/?payment=cancelled`
   - Production: `https://yourdomain.com/?payment=cancelled`

### Update Plan Names:

For each link, change the plan in the URL:
- Essential Monthly: `plan=essential&interval=month`
- Essential Annual: `plan=essential&interval=year`
- Professional Monthly: `plan=professional&interval=month`
- Professional Annual: `plan=professional&interval=year`

## 📝 Example URLs

**Essential Monthly Success:**
```
http://localhost:5173/?payment=success&plan=essential&interval=month
```

**Professional Annual Success:**
```
http://localhost:5173/?payment=success&plan=professional&interval=year
```

**Cancel (same for all):**
```
http://localhost:5173/?payment=cancelled
```

## ✅ Test It

1. Go to pricing page
2. Click "Start Free Trial"
3. Complete payment with test card: `4242 4242 4242 4242`
4. Should redirect back to your confirmation page! 🎉

---

**See `PAYMENT_REDIRECT_SETUP.md` for detailed instructions.**

