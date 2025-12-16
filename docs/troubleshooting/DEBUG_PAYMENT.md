# Quick Payment Error Debugging

## The Error

You're seeing: **"Failed to create payment intent"**

## Quick Fix Steps

### 1. Check Browser Console

Open browser DevTools (F12) and check the Console tab. Look for:

- Red error messages
- The actual error details
- Network errors

### 2. Check if Backend URL is Set

Open browser console and run:

```javascript
console.log("Backend URL:", import.meta.env.VITE_BACKEND_API_URL);
console.log("LocalStorage URL:", localStorage.getItem("backend_api_url"));
```

**If both are `undefined` or empty:**

- Create a `.env.local` file in your project root
- Add: `VITE_BACKEND_API_URL=http://localhost:3000`
- Restart your dev server (`npm run dev`)

**Or set it temporarily in browser console:**

```javascript
localStorage.setItem("backend_api_url", "http://localhost:3000");
location.reload();
```

### 3. Test Your Backend

Open browser console and run:

```javascript
fetch("http://localhost:3000/api/create-payment-intent", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    planId: "essential",
    interval: "month",
    amount: 2499,
    customerEmail: "test@test.com",
  }),
})
  .then((r) => r.json())
  .then(console.log)
  .catch(console.error);
```

**What to expect:**

- ✅ Success: `{clientSecret: "pi_...", paymentIntentId: "pi_..."}`
- ❌ Error: Check the error message

### 4. Common Issues & Solutions

| Error                             | Solution                                                    |
| --------------------------------- | ----------------------------------------------------------- |
| "Backend API URL not configured"  | Set `VITE_BACKEND_API_URL` in `.env.local`                  |
| "Cannot connect" or Network Error | Start your backend server                                   |
| 404 Not Found                     | Check backend endpoint path is `/api/create-payment-intent` |
| 500 Server Error                  | Check backend logs for Stripe key issues                    |
| CORS Error                        | Configure CORS in backend to allow your frontend URL        |

### 5. Check Backend Server Status

**If using Express.js backend:**

- Is the server running? Check terminal
- Default port should be 3000
- Check for any error messages in server logs

**Quick backend test:**

```bash
curl http://localhost:3000/api/create-payment-intent \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"planId":"essential","interval":"month","amount":9900,"customerEmail":"test@test.com"}'
```

### 6. Need a Backend Server?

If you don't have a backend server set up yet:

1. **Option A: Use the example backend**

   - See `backend-example/payment-intent-server-example.js`
   - Run: `node backend-example/payment-intent-server-example.js`
   - Make sure you have `STRIPE_SECRET_KEY` in environment

2. **Option B: Use Supabase Edge Functions**
   - Deploy serverless functions
   - Set `VITE_BACKEND_API_URL` to your Supabase function URL

### Still Having Issues?

1. Open browser DevTools (F12)
2. Go to Network tab
3. Try to create payment intent again
4. Look at the failed request
5. Check:
   - Request URL (is it correct?)
   - Response status (404, 500, etc.)
   - Response body (what error message?)

Share the error details from the console/network tab for more help!
