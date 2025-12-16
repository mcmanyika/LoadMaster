# Troubleshooting Guide

## Payment Intent Error: "Failed to create payment intent"

If you're seeing this error in the payment modal, here's how to fix it:

### Step 1: Check Backend API URL Configuration

1. **Check if `VITE_BACKEND_API_URL` is set:**

   - Open browser console (F12)
   - Type: `console.log(import.meta.env.VITE_BACKEND_API_URL)`
   - It should show your backend URL (e.g., `http://localhost:3000`)

2. **Set the backend URL:**

   **Option A: Create/Update `.env.local` file:**

   ```env
   VITE_BACKEND_API_URL=http://localhost:3000
   ```

   **Option B: Set in browser console (temporary):**

   ```javascript
   localStorage.setItem("backend_api_url", "http://localhost:3000");
   ```

   Then refresh the page.

### Step 2: Check if Backend Server is Running

1. **Test if backend is accessible:**

   - Open browser console
   - Type: `fetch('http://localhost:3000/api/create-payment-intent', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({planId: 'essential', interval: 'month', amount: 2499, customerEmail: 'test@test.com'})})`
   - Check the response in the Network tab

2. **Common backend issues:**
   - Backend server not started
   - Wrong port number
   - CORS not configured
   - Backend endpoint path is wrong

### Step 3: Verify Backend Endpoint

Your backend should have this endpoint:

- **URL:** `POST /api/create-payment-intent`
- **Expected request body:**
  ```json
  {
    "planId": "essential",
    "interval": "month",
    "amount": 9900,
    "customerEmail": "user@example.com"
  }
  ```
- **Expected response:**
  ```json
  {
    "clientSecret": "pi_xxx_secret_xxx",
    "paymentIntentId": "pi_xxx"
  }
  ```

### Step 4: Check Browser Console

Open browser console (F12) and look for:

- Red error messages
- Network requests to your backend
- Any CORS errors
- 404 or 500 errors

### Quick Fix Checklist

- [ ] Backend API URL is set in `.env.local` or localStorage
- [ ] Backend server is running
- [ ] Backend has `/api/create-payment-intent` endpoint
- [ ] CORS is configured to allow your frontend URL
- [ ] Stripe secret key is set in backend environment variables
- [ ] Backend can connect to Stripe API

### Testing Your Backend

You can test your backend endpoint directly using curl:

```bash
curl -X POST http://localhost:3000/api/create-payment-intent \
  -H "Content-Type: application/json" \
  -d '{
    "planId": "essential",
    "interval": "month",
    "amount": 9900,
    "customerEmail": "test@example.com"
  }'
```

Expected response:

```json
{
  "clientSecret": "pi_xxx_secret_xxx",
  "paymentIntentId": "pi_xxx"
}
```

### Common Error Messages

**"Backend API URL not configured"**

- Solution: Set `VITE_BACKEND_API_URL` in `.env.local`

**"Cannot connect to backend server"**

- Solution: Start your backend server or check the URL

**"Backend endpoint not found (404)"**

- Solution: Check if endpoint path is `/api/create-payment-intent`

**"Backend server error (500)"**

- Solution: Check backend server logs for details

**"CORS error"**

- Solution: Configure CORS in your backend to allow your frontend origin

### Need More Help?

1. Check the browser console for detailed error messages
2. Check your backend server logs
3. Verify your Stripe keys are correct
4. See `ENVIRONMENT_VARIABLES.md` for environment setup
5. See `STRIPE_SETUP.md` for Stripe configuration
