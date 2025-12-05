# 🚀 START HERE - Fix the 404 Error

Your error is happening because **the backend server isn't running**.

## Quick Fix (2 Steps):

### Step 1: Add Your Stripe Secret Key

1. Go to https://dashboard.stripe.com/apikeys
2. Copy your **Secret key** (starts with `sk_test_`)
3. Open `backend-server/.env` file
4. Replace `sk_test_your_key_here` with your actual key

### Step 2: Start the Backend Server

Open a **new terminal window** and run:

```bash
cd backend-server
npm start
```

You should see:
```
✅ Backend server is running!
📍 Server URL: http://localhost:3000
```

**Keep this terminal open** - the server needs to keep running!

### Step 3: Try Payment Again

Now go back to your browser and click "Start Free Trial" on the pricing page - the error should be gone! ✅

---

## What's Happening?

- Your frontend is trying to call: `http://localhost:3000/api/create-payment-intent`
- But there's no server running on port 3000
- That's why you get the 404 error
- Once you start the backend server, it will work!

---

## Need Help?

- Backend won't start? Check the terminal for error messages
- Port 3000 in use? Change `PORT=3001` in `.env` and update frontend `VITE_BACKEND_API_URL`
- Still errors? Check `TROUBLESHOOTING.md` or browser console for details

