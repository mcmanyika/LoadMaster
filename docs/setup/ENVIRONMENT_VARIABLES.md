# Environment Variables Guide

This document explains all environment variables used in LoadMaster.

## Required Environment Variables

### `VITE_BACKEND_API_URL`

**What it is:**
The URL of your backend API server that handles Stripe payment operations.

**Why you need it:**
- Stripe Payment Intents require server-side code (you can't create them from the frontend)
- Your backend needs to securely handle your Stripe secret key
- The frontend calls your backend API to create payment intents and subscriptions

**Example values:**
- Development: `http://localhost:3000`
- Production: `https://api.loadmaster.com` or `https://your-api.herokuapp.com`
- Supabase Edge Function: `https://your-project.supabase.co/functions/v1`

**How to set it:**

1. **Create a `.env.local` file** in the root directory:
   ```env
   VITE_BACKEND_API_URL=http://localhost:3000
   ```

2. **For production**, set it in your hosting platform:
   - Vercel: Add in Project Settings → Environment Variables
   - Netlify: Add in Site Settings → Environment Variables
   - Other platforms: Check their documentation for environment variable setup

3. **Alternative:** You can also set it in localStorage via browser console:
   ```javascript
   localStorage.setItem('backend_api_url', 'http://localhost:3000');
   ```

**What endpoints your backend needs:**
- `POST /api/create-payment-intent` - Creates a Stripe Payment Intent
- `POST /api/create-subscription` - Creates a subscription after payment
- `POST /api/create-portal-session` - Creates customer portal session (optional)

See `backend-example/payment-intent-server-example.js` for a complete example.

---

### `VITE_STRIPE_PUBLISHABLE_KEY`

**What it is:**
Your Stripe publishable key (starts with `pk_test_` for test mode or `pk_live_` for live mode).

**Where to find it:**
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers** → **API keys**
3. Copy the **Publishable key**

**Example:**
```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51AbC123...
```

**Important:** This key is safe to use in frontend code (that's why it's called "publishable").

---

### `GEMINI_API_KEY` (Optional)

**What it is:**
Google Gemini API key for AI analysis features.

**Where to find it:**
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy it

**Example:**
```env
GEMINI_API_KEY=AIzaSyAbC123...
```

---

### `VITE_OPENAI_API_KEY` (Optional)

**What it is:**
OpenAI API key for the chatbot feature on the landing page.

**Where to find it:**
1. Go to [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the key (it starts with `sk-`)

**Example:**
```env
VITE_OPENAI_API_KEY=sk-...
```

**Security Note:**
- This key will be exposed in the frontend bundle
- For production, consider using a Supabase Edge Function to proxy OpenAI calls for better security
- Set usage limits in your OpenAI account to control costs
- The chatbot uses `gpt-4o-mini` model by default (cost-effective option)

---

## Complete `.env.local` Example

Create a `.env.local` file in your project root:

```env
# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
VITE_BACKEND_API_URL=http://localhost:3000

# Optional: AI Features
GEMINI_API_KEY=your_gemini_api_key_here
VITE_OPENAI_API_KEY=sk-your_openai_api_key_here

# Supabase (if using)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Important Notes

1. **Never commit `.env.local`** - It's already in `.gitignore`
2. **Use different keys for development and production**
3. **The `VITE_` prefix is required** for Vite to expose variables to the frontend
4. **Restart your dev server** after changing environment variables

## Backend Server Setup

Your backend server needs to handle these endpoints. You have several options:

### Option 1: Express.js Server
See `backend-example/payment-intent-server-example.js`

### Option 2: Supabase Edge Functions
Deploy serverless functions at `supabase/functions/`

### Option 3: Serverless Functions
- Vercel Serverless Functions
- Netlify Functions
- AWS Lambda
- Google Cloud Functions

All options should implement the same API endpoints shown in the backend example.

