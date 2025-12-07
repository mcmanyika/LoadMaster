# Storage Bucket Setup Script

This script creates the `rate-confirmations` storage bucket in Supabase.

## Quick Setup (Recommended)

The easiest way is to create the bucket via the Supabase Dashboard:

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Storage** in the left sidebar
4. Click **Create a new bucket**
5. Name it: `rate-confirmations`
6. Set it to **Public** (or Private with RLS policies)
7. Click **Create bucket**

## Using the Script

If you prefer to use the script, you'll need your Supabase service role key:

1. Get your service role key:
   - Go to Supabase Dashboard > Settings > API
   - Copy the "service_role" key (⚠️ keep this secret!)

2. Run the script:
   ```bash
   SUPABASE_SERVICE_ROLE_KEY="your-service-role-key" node scripts/create-storage-bucket.js
   ```

   Or set it as an environment variable:
   ```bash
   export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   node scripts/create-storage-bucket.js
   ```

## Storage Policies (If Using Private Bucket)

If you set the bucket to Private, you'll need to add RLS policies. Run this SQL in the Supabase SQL Editor:

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

