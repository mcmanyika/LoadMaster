# Storage Bucket Setup Scripts

These scripts create storage buckets in Supabase for the LoadMaster application.

## Available Scripts

1. `create-storage-bucket.js` - Creates the `rate-confirmations` bucket for load PDFs
2. `create-expense-receipts-bucket.js` - Creates the `expense-receipts` bucket for expense receipts

## Quick Setup (Recommended)

The easiest way is to create the buckets via the Supabase Dashboard:

### Rate Confirmations Bucket

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Storage** in the left sidebar
4. Click **Create a new bucket**
5. Name it: `rate-confirmations`
6. Set it to **Public** (or Private with RLS policies)
7. Click **Create bucket**

### Expense Receipts Bucket

1. Follow the same steps above
2. Name it: `expense-receipts`
3. Set it to **Public** (or Private with RLS policies)
4. Click **Create bucket**

## Using the Scripts

If you prefer to use the scripts, you'll need your Supabase service role key:

1. Get your service role key:
   - Go to Supabase Dashboard > Settings > API
   - Copy the "service_role" key (⚠️ keep this secret!)

2. Run the scripts:
   ```bash
   # For rate-confirmations bucket
   SUPABASE_SERVICE_ROLE_KEY="your-service-role-key" node scripts/create-storage-bucket.js
   
   # For expense-receipts bucket
   SUPABASE_SERVICE_ROLE_KEY="your-service-role-key" node scripts/create-expense-receipts-bucket.js
   ```

   Or set it as an environment variable:
   ```bash
   export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   node scripts/create-storage-bucket.js
   node scripts/create-expense-receipts-bucket.js
   ```

## Storage Policies

Storage policies are automatically set up in the migration files:
- `015_setup_storage_policies.sql` - Sets up policies for `rate-confirmations` bucket
- `016_create_expenses_module.sql` - Sets up policies for `expense-receipts` bucket

If you set the buckets to Private and need to manually add RLS policies, you can run the SQL from those migration files in the Supabase SQL Editor.

### Rate Confirmations Policies

```sql
-- Allow authenticated users to upload files
CREATE POLICY "Users can upload rate confirmations"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'rate-confirmations');

-- Allow authenticated users to read files
CREATE POLICY "Users can read rate confirmations"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'rate-confirmations');

-- Allow authenticated users to delete files
CREATE POLICY "Users can delete rate confirmations"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'rate-confirmations');
```

### Expense Receipts Policies

```sql
-- Allow authenticated users to upload files
CREATE POLICY "Users can upload expense receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'expense-receipts');

-- Allow authenticated users to read files
CREATE POLICY "Users can read expense receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'expense-receipts');

-- Allow authenticated users to delete files
CREATE POLICY "Users can delete expense receipts"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'expense-receipts');
```

