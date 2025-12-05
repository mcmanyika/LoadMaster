# Backend Server Setup - Quick Guide

## You're seeing a 404 error because the backend server isn't running!

Follow these steps:

### Step 1: Create `.env` file

Create a `.env` file in the `backend-server/` directory:

```env
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
PORT=3000
FRONTEND_URL=http://localhost:5173
```

**To get your Stripe secret key:**
1. Go to https://dashboard.stripe.com/apikeys
2. Copy the **Secret key** (starts with `sk_test_` for test mode)

### Step 2: Start the backend server

```bash
cd backend-server
npm start
```

You should see:
```
✅ Backend server is running!
📍 Server URL: http://localhost:3000
```

### Step 3: Test it works

Open browser console and run:
```javascript
fetch('http://localhost:3000/health')
  .then(r => r.json())
  .then(console.log)
```

Should return: `{status: 'ok', message: 'Backend server is running'}`

### Step 4: Try payment again

Go back to your pricing page and click "Start Free Trial" - the error should be gone!

---

## Troubleshooting

**Port 3000 already in use?**
- Change `PORT=3001` in `.env`
- Update frontend `.env.local`: `VITE_BACKEND_API_URL=http://localhost:3001`

**Still getting errors?**
- Check backend server terminal for error messages
- Make sure Stripe secret key is correct
- Check browser console for specific error details

