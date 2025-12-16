# LoadMaster Backend Server

Simple Express.js backend server for handling Stripe Payment Intents.

## Quick Start

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Create `.env` file:**

   ```bash
   cp .env.example .env
   ```

3. **Add your Stripe secret key to `.env`:**

   ```env
   STRIPE_SECRET_KEY=sk_test_your_key_here
   ```

   Get your key from: https://dashboard.stripe.com/apikeys

4. **Start the server:**

   ```bash
   npm start
   ```

   Or for development with auto-reload:

   ```bash
   npm run dev
   ```

5. **The server will run on:** `http://localhost:3000`

## Endpoints

- `GET /health` - Health check
- `POST /api/create-payment-intent` - Create Stripe Payment Intent
- `POST /api/create-subscription` - Create subscription after payment
- `POST /api/create-portal-session` - Customer portal access

## Testing

Test the server:

```bash
curl http://localhost:3000/health
```

Test payment intent creation:

```bash
curl -X POST http://localhost:3000/api/create-payment-intent \
  -H "Content-Type: application/json" \
  -d '{
    "planId": "essential",
    "interval": "month",
    "amount": 2499,
    "customerEmail": "test@example.com"
  }'
```

## Troubleshooting

- **Port 3000 already in use?** Change `PORT` in `.env` file
- **CORS errors?** Make sure `FRONTEND_URL` in `.env` matches your frontend URL
- **Stripe errors?** Check your Stripe secret key is correct
