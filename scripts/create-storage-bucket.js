/**
 * Script to create the rate-confirmations storage bucket in Supabase
 * 
 * Usage:
 *   node scripts/create-storage-bucket.js
 * 
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables
 * 
 * To get your service role key:
 * 1. Go to Supabase Dashboard > Settings > API
 * 2. Copy the "service_role" key (keep this secret!)
 * 3. Set it: export SUPABASE_SERVICE_ROLE_KEY="your-key"
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://cwkaqyxbughjtkbukliq.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY is required');
  console.log('\nTo get your service role key:');
  console.log('1. Go to your Supabase Dashboard');
  console.log('2. Navigate to Settings > API');
  console.log('3. Copy the "service_role" key (keep this secret!)');
  console.log('4. Set it as an environment variable:');
  console.log('   export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"');
  console.log('\nOr run the script with:');
  console.log('   SUPABASE_SERVICE_ROLE_KEY="your-key" node scripts/create-storage-bucket.js');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const BUCKET_NAME = 'rate-confirmations';

async function createStorageBucket() {
  try {
    console.log(`\n🔍 Checking if bucket '${BUCKET_NAME}' exists...`);
    
    // Check if bucket already exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError.message);
      return;
    }
    
    const bucketExists = buckets.some(bucket => bucket.name === BUCKET_NAME);
    
    if (bucketExists) {
      console.log(`✅ Bucket '${BUCKET_NAME}' already exists!`);
      return;
    }
    
    console.log(`📦 Creating bucket '${BUCKET_NAME}'...`);
    
    // Create the bucket (public by default for easier access)
    const { data, error } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: ['application/pdf']
    });
    
    if (error) {
      console.error('❌ Error creating bucket:', error.message);
      console.log('\n💡 If you see a permission error, you may need to:');
      console.log('   1. Use the Supabase Dashboard to create it manually');
      console.log('   2. Or ensure your service role key has the correct permissions');
      return;
    }
    
    console.log(`✅ Successfully created bucket '${BUCKET_NAME}'!`);
    console.log('\n📝 Next steps:');
    console.log('   1. The bucket is set to PUBLIC for easier access');
    console.log('   2. If you prefer a private bucket, you can change it in the Supabase Dashboard');
    console.log('   3. If using a private bucket, you\'ll need to set up RLS policies (see docs/features/RATE_CONFIRMATION_PDF_SETUP.md)');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

createStorageBucket();
