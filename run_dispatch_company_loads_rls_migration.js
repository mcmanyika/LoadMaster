// Script to run the dispatch company loads RLS migration
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// IMPORTANT: Update these with your Supabase credentials
// You can find these in your Supabase project settings
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || 'YOUR_SERVICE_ROLE_KEY';

if (!SUPABASE_URL || SUPABASE_URL === 'YOUR_SUPABASE_URL' || !SUPABASE_KEY || SUPABASE_KEY === 'YOUR_SERVICE_ROLE_KEY') {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  console.error('💡 This migration modifies RLS policies and should be run manually in Supabase SQL Editor');
  console.error('   See instructions below.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runMigration() {
  try {
    console.log('🚀 Running migration: Add Dispatch Company Support to Loads RLS Policies');
    console.log('📄 File: supabase_migrations/040_add_dispatch_company_loads_rls.sql\n');
    
    const sql = readFileSync('supabase_migrations/040_add_dispatch_company_loads_rls.sql', 'utf8');
    
    console.log('⚠️  IMPORTANT: This migration modifies RLS policies.');
    console.log('💡 RLS policy changes typically require manual execution in Supabase SQL Editor.\n');
    console.log('📝 SQL Content:');
    console.log('─'.repeat(80));
    console.log(sql);
    console.log('─'.repeat(80));
    console.log('\n💡 To run this migration:');
    console.log('   1. Go to your Supabase Dashboard');
    console.log('   2. Navigate to SQL Editor');
    console.log('   3. Copy and paste the SQL above');
    console.log('   4. Execute the SQL');
    console.log('\n✅ Migration file ready for manual execution.');
    
  } catch (error) {
    console.error('❌ Error reading migration file:', error.message);
    console.error('\n💡 Please manually run: supabase_migrations/040_add_dispatch_company_loads_rls.sql');
    process.exit(1);
  }
}

runMigration();

