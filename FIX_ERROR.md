# 🔧 Fix Your Payment Error

## Current Status
✅ Fixed backend URL: Changed from `https://localhost:3000` to `http://localhost:3000`
✅ Updated backend `.env` file with your Stripe secret key

## ❌ The Problem
**Your backend server is NOT running!**

When you click "Start Free Trial", your frontend tries to call:
- `http://localhost:3000/api/create-payment-intent`

But there's no server running on port 3000 to handle this request, so you get a 404 error.

## ✅ The Solution

You need to **start the backend server in a separate terminal**.

### Step 1: Open a NEW Terminal Window

Don't close your frontend dev server terminal - you need BOTH running!

### Step 2: Start the Backend Server

Run this command:

```bash
cd /Users/micah/Documents/dapp/LoadMaster/backend-server
npm start
```

You should see:
```
✅ Backend server is running!
📍 Server URL: http://localhost:3000
💳 Payment Intent: http://localhost:3000/api/create-payment-intent
```

### Step 3: Keep It Running

**Don't close this terminal!** The backend server needs to stay running.

### Step 4: Test Again

Go back to your browser and click "Start Free Trial" - the error should be gone! 🎉

---

## Quick Start Script

Or use the start script I created:

```bash
./start-backend.sh
```

---

## You Should Have 2 Terminals Running:

1. **Terminal 1:** Frontend dev server (`npm run dev`) - Port 5173
2. **Terminal 2:** Backend server (`npm start` in backend-server/) - Port 3000

Both need to be running at the same time!

---

## Still Getting Errors?

1. Check backend terminal for error messages
2. Make sure Stripe secret key is correct in `backend-server/.env`
3. Check browser console (F12) for specific error details
4. Verify backend is running: `curl http://localhost:3000/health`

