# Marketing Module Setup Guide

## ✅ Implementation Complete

A comprehensive marketing management module has been added to LoadMaster. This module is **only visible to users with the 'owner' role** and provides tools to manage WhatsApp ad campaigns.

## 📋 What Was Created

### 1. Database Migration
- **File**: `supabase_migrations/005_create_marketing_tables.sql`
- Creates 3 tables:
  - `marketing_ads` - Stores the 12 weekly ad variations
  - `marketing_posts` - Tracks posting history
  - `marketing_metrics` - Tracks responses, calls, conversions
- Includes RLS policies (owner-only access)
- Pre-populates with all 12 ad variations

### 2. TypeScript Interfaces
- **File**: `types.ts`
- Added `MarketingAd`, `MarketingPost`, `MarketingMetric` interfaces
- Added `MetricType` type

### 3. Marketing Service
- **File**: `services/marketingService.ts`
- CRUD operations for ads, posts, and metrics
- Analytics calculation functions
- Works with both Supabase and demo mode

### 4. Marketing Component
- **File**: `components/Marketing.tsx`
- Full-featured UI with 4 tabs:
  - **Ad Library**: View and copy all 12 weekly variations
  - **Posting History**: Log posts and track responses
  - **Response Tracker**: Record and manage responses
  - **Analytics**: View performance metrics and charts

### 5. App Integration
- **File**: `App.tsx`
- Added marketing navigation button (owner-only)
- Integrated marketing view
- Added proper routing and state management

## 🚀 Setup Steps

### Step 1: Run Database Migration

1. Open your Supabase Dashboard
2. Go to **SQL Editor**
3. Copy and paste the contents of `supabase_migrations/005_create_marketing_tables.sql`
4. Click **Run** to execute the migration

This will:
- Create the 3 marketing tables
- Set up RLS policies (owner-only access)
- Insert all 12 pre-written ad variations

### Step 2: Test the Module

1. Start your development server: `npm run dev`
2. Log in as a user with `role: 'owner'`
3. You should see a new **Marketing** button in the sidebar
4. Click it to access the marketing module

## 🎨 Features

### Ad Library Tab
- View all 12 weekly ad variations
- One-click copy to clipboard
- Organized by week number
- Edit ad content (if needed)

### Posting History Tab
- Log when you post an ad
- Link posts to specific ad variations
- Add notes about posting context
- Track platform (WhatsApp, Facebook, etc.)
- View responses for each post

### Response Tracker Tab
- Record responses from prospects
- Track different metric types:
  - Response
  - Call Scheduled
  - Demo Scheduled
  - Conversion
  - Not Interested
- Store contact information
- Add notes for follow-up

### Analytics Tab
- **Key Metrics**:
  - Total Posts
  - Total Responses
  - Response Rate
  - Calls Scheduled
  - Conversions
  - Conversion Rate
- **Charts**:
  - Pie chart showing response types
  - Visual breakdown of metrics

## 🔒 Security

- **Row Level Security (RLS)** enabled on all tables
- Only users with `role: 'owner'` can access
- Policies check user role before allowing access
- Navigation button only visible to owners

## 📊 Usage Workflow

1. **Weekly Posting**:
   - Go to Ad Library tab
   - Select the week's ad variation
   - Click "Copy" to copy the text
   - Post to WhatsApp
   - Return to Posting History tab
   - Click "Log Post" to record it

2. **Tracking Responses**:
   - When you get a response, go to Response Tracker
   - Click "Add Response"
   - Select the related post (optional)
   - Choose response type
   - Enter contact information
   - Add notes

3. **Review Analytics**:
   - Go to Analytics tab
   - View performance metrics
   - See which ad variations perform best
   - Track conversion rates

## 🎯 Best Practices

1. **Consistency**: Post on the same day/time each week
2. **Tracking**: Always log posts immediately after posting
3. **Responses**: Record responses as soon as you receive them
4. **Notes**: Add detailed notes for better follow-up
5. **Review**: Check analytics weekly to optimize strategy

## 🐛 Troubleshooting

### Marketing Button Not Visible
- Ensure you're logged in as a user with `role: 'owner'`
- Check that the migration ran successfully
- Verify RLS policies are in place

### Can't Access Marketing Module
- Check browser console for errors
- Verify database migration completed
- Ensure user role is set to 'owner' in profiles table

### Analytics Not Showing
- Make sure you have posts and metrics logged
- Check that data is being saved to database
- Verify RLS policies allow read access

## 📝 Next Steps

1. Run the database migration
2. Test the module as an owner user
3. Start logging your weekly posts
4. Track responses as they come in
5. Review analytics to optimize your campaigns

## ✨ You're All Set!

The marketing module is now ready to use. Only owners can access it, and it provides everything you need to manage your WhatsApp ad campaigns effectively.

