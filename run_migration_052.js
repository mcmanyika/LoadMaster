// Run migration 052 using Supabase REST API
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_URL = 'https://cwkaqyxbughjtkbukliq.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.error('   Set it with: export SUPABASE_SERVICE_ROLE_KEY=your_service_role_key');
  console.error('\n💡 You can find your service role key in:');
  console.error('   Supabase Dashboard > Project Settings > API > service_role key');
  process.exit(1);
}

async function runMigration() {
  try {
    console.log('🚀 Executing migration 052: Allow dispatchers to view companies via associations\n');
    
    const migrationFile = join(__dirname, 'supabase_migrations/052_allow_dispatchers_view_companies_via_associations.sql');
    const sql = readFileSync(migrationFile, 'utf8');
    
    // Use Supabase Management API to execute SQL
    // Note: This requires the service role key
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ sql_query: sql })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Migration executed successfully!');
      console.log('   Result:', result);
      return;
    }

    // If exec_sql doesn't exist, try alternative: use Supabase Management API
    console.log('⚠️  exec_sql RPC not available, trying Management API...\n');
    
    // Alternative: Use Supabase Management API (requires project ref)
    const projectRef = 'cwkaqyxbughjtkbukliq'; // Extract from URL
    
    console.log('\n📝 Since automatic execution is not available, please run this SQL manually:');
    console.log('\n' + '='.repeat(80));
    console.log(sql);
    console.log('='.repeat(80));
    console.log('\n💡 Steps to execute:');
    console.log('   1. Go to: https://supabase.com/dashboard/project/' + projectRef);
    console.log('   2. Navigate to SQL Editor (left sidebar)');
    console.log('   3. Click "New query"');
    console.log('   4. Copy and paste the SQL above');
    console.log('   5. Click "Run" or press Cmd/Ctrl + Enter');
    console.log('\n✅ After execution, the owner company name will appear in the LoadForm modal for dispatchers.');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\n💡 Please run the migration manually in Supabase SQL Editor');
    process.exit(1);
  }
}

runMigration();

