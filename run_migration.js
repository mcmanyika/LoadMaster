// Temporary script to run SQL migration
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const SUPABASE_URL = 'https://cwkaqyxbughjtkbukliq.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY or SUPABASE_KEY environment variable is required');
  console.error('Please set it in your environment or .env file');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const sql = readFileSync('supabase_migrations/FIX_companies_rls_for_dispatchers.sql', 'utf8');

async function runMigration() {
  try {
    console.log('Running migration: FIX_companies_rls_for_dispatchers.sql');
    
    // Split SQL by semicolons and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.substring(0, 100) + '...');
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
        if (error) {
          // Try direct query if RPC doesn't work
          const { error: queryError } = await supabase.from('_migrations').select('*').limit(0);
          if (queryError && error.message.includes('exec_sql')) {
            console.error('Note: exec_sql function not available. Please run this migration in Supabase SQL Editor.');
            console.error('Migration file location: supabase_migrations/FIX_companies_rls_for_dispatchers.sql');
            process.exit(1);
          }
          throw error;
        }
      }
    }
    
    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Error running migration:', error.message);
    console.error('\nPlease run this migration manually in Supabase SQL Editor:');
    console.error('1. Go to https://supabase.com/dashboard');
    console.error('2. Select your project');
    console.error('3. Go to SQL Editor');
    console.error('4. Copy and paste the contents of: supabase_migrations/FIX_companies_rls_for_dispatchers.sql');
    console.error('5. Click Run');
    process.exit(1);
  }
}

runMigration();

