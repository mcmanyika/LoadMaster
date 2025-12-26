// Execute migration 052: Allow dispatchers to view companies via associations
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://cwkaqyxbughjtkbukliq.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.error('   This migration modifies RLS policies and requires service role key');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeMigration() {
  try {
    console.log('🚀 Executing migration 052: Allow dispatchers to view companies via associations\n');
    
    const migrationFile = join(__dirname, 'supabase_migrations/052_allow_dispatchers_view_companies_via_associations.sql');
    const sql = readFileSync(migrationFile, 'utf8');
    
    // Split SQL into individual statements
    // Handle DO blocks and multi-line statements properly
    const statements = [];
    let currentStatement = '';
    let inDoBlock = false;
    let doBlockDepth = 0;
    
    const lines = sql.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines and comments
      if (!line || line.startsWith('--')) {
        continue;
      }
      
      currentStatement += (currentStatement ? '\n' : '') + lines[i];
      
      // Track DO block depth
      if (line.toUpperCase().startsWith('DO $$')) {
        inDoBlock = true;
        doBlockDepth = 1;
      } else if (inDoBlock) {
        if (line.includes('$$')) {
          doBlockDepth--;
        }
        if (line.includes('$$') && doBlockDepth === 0) {
          inDoBlock = false;
        }
      }
      
      // Check if statement is complete (ends with semicolon and not in DO block)
      if (!inDoBlock && line.endsWith(';')) {
        const statement = currentStatement.trim();
        if (statement) {
          statements.push(statement);
        }
        currentStatement = '';
      } else if (inDoBlock && !inDoBlock && line.includes('$$') && doBlockDepth === 0) {
        const statement = currentStatement.trim();
        if (statement) {
          statements.push(statement);
        }
        currentStatement = '';
      }
    }
    
    // Add any remaining statement
    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }
    
    console.log(`📝 Found ${statements.length} SQL statement(s) to execute\n`);
    
    // Execute each statement using RPC or REST API
    // Note: Supabase JS client doesn't support raw SQL execution directly
    // We need to use the REST API or a stored procedure
    
    // Try using the REST API with rpc call
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
      
      try {
        // Use REST API to execute SQL via pg_net or create a function
        // Since we can't execute raw SQL directly, we'll use the REST API
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
          },
          body: JSON.stringify({ query: statement })
        });
        
        if (!response.ok) {
          // Try alternative approach - create a temporary function
          console.log('⚠️  Direct RPC not available, using alternative method...');
          throw new Error('RPC not available');
        }
        
        const result = await response.json();
        console.log(`✅ Statement ${i + 1} executed successfully`);
      } catch (error) {
        // Alternative: Use Supabase REST API directly with SQL
        console.log('⚠️  Trying alternative execution method...');
        
        // For RLS policy changes, we might need to execute via SQL Editor
        // Let's output the SQL for manual execution
        console.log('\n⚠️  Automatic execution not available. Please run this SQL manually:');
        console.log('\n' + '='.repeat(80));
        console.log(sql);
        console.log('='.repeat(80));
        console.log('\n💡 Go to Supabase Dashboard > SQL Editor and paste the SQL above');
        process.exit(0);
      }
    }
    
    console.log('\n✅ Migration 052 completed successfully!');
    console.log('   - Companies table RLS policy updated');
    console.log('   - Dispatchers can now view companies via associations');
    
  } catch (error) {
    console.error('\n❌ Error executing migration:', error.message);
    console.error('\n💡 Please run this migration manually in Supabase SQL Editor:');
    console.error('   1. Go to https://supabase.com/dashboard');
    console.error('   2. Navigate to SQL Editor');
    console.error('   3. Copy and paste the SQL from: supabase_migrations/052_allow_dispatchers_view_companies_via_associations.sql');
    console.error('   4. Execute the SQL');
    process.exit(1);
  }
}

executeMigration();

