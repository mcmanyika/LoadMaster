# Quick Start: Backend Server Setup

Your frontend is trying to connect to `http://localhost:3000` but there's no backend server running. Here's how to fix it:

## Option 1: Simple Express Backend (Recommended for Local Development)

### Step 1: Create Backend Server

I've already created a backend server for you in the `backend-server/` directory.

### Step 2: Install Dependencies

```bash
cd backend-server
npm install
```

### Step 3: Set Up Stripe Key

1. Get your Stripe secret key from https://dashboard.stripe.com/apikeys
2. Create a `.env` file in `backend-server/`:
   ```env
   STRIPE_SECRET_KEY=sk_test_your_key_here
   PORT=3000
   FRONTEND_URL=http://localhost:5173
   ```

### Step 4: Start the Server

```bash
npm start
```

You should see:
```
✅ Backend server is running!
📍 Server URL: http://localhost:3000
```

### Step 5: Test It

Open your browser console and run:
```javascript
fetch('http://localhost:3000/health')
  .then(r => r.json())
  .then(console.log)
```

Should return: `{status: 'ok', message: 'Backend server is running'}`

### Step 6: Try Payment Again

Now go back to your pricing page and try subscribing again. The error should be gone!

---

## Option 2: Use Supabase Edge Functions (For Production)

If you're using Supabase, you can deploy serverless functions instead. See `STRIPE_SETUP.md` for details.

---

## Troubleshooting

**"Port 3000 already in use"**
- Change `PORT=3001` in `.env` and update `VITE_BACKEND_API_URL` in frontend

**"Cannot connect"**
- Make sure the backend server is running
- Check the terminal for any errors
- Verify `VITE_BACKEND_API_URL=http://localhost:3000` in frontend `.env.local`

**"Stripe error"**
- Check your Stripe secret key is correct
- Make sure you're using test keys (start with `sk_test_`)

---

## Next Steps After Backend is Running

1. ✅ Backend server running on port 3000
2. ✅ Frontend configured with `VITE_BACKEND_API_URL=http://localhost:3000`
3. ✅ Try the payment flow again

The payment modal should now work!

