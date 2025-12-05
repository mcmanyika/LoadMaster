<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/16Wc55QMUueRQHk61-a0D84TTRLERrF34

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. **Database Setup (if using Supabase):**
   - Connect to your Supabase project
   - Run the migration in `supabase_migrations/001_add_fee_percentage_to_profiles.sql` in the Supabase SQL Editor
   - This adds the `fee_percentage` column to the `profiles` table for dispatcher fee tracking
4. Run the app:
   `npm run dev`

## Database Migrations

If you're using Supabase, you'll need to run the database migrations:

### Migration 1: Add Fee Percentage to Profiles
**File:** `supabase_migrations/001_add_fee_percentage_to_profiles.sql`

This migration adds the `fee_percentage` column to the `profiles` table to support custom dispatcher commission rates.

### Migration 2: Add Subscription Fields
**File:** `supabase_migrations/002_add_subscription_fields.sql`

This migration adds subscription tracking fields to the `profiles` table for Stripe integration.

To apply migrations:
1. Open your Supabase project dashboard
2. Go to SQL Editor
3. Copy and paste the contents of each migration file
4. Run the SQL queries in order

## Stripe Payment Setup

LoadMaster includes Stripe payment integration for subscriptions. See [STRIPE_SETUP.md](STRIPE_SETUP.md) for detailed setup instructions.

Quick setup:
1. Get your Stripe keys from [Stripe Dashboard](https://dashboard.stripe.com)
2. Create products and prices in Stripe for each plan
3. Set environment variable: `VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...`
4. Set up backend API endpoints (see `STRIPE_SETUP.md` for examples)
5. Run migration `002_add_subscription_fields.sql`
