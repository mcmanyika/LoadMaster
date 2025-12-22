// Script to run the dispatch company support migration
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const SUPABASE_URL = 'https://cwkaqyxbughjtkbukliq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3a2FxeXhidWdoanRrYnVrbGlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5MDQwMzQsImV4cCI6MjA4MDQ4MDAzNH0.pcO7hab0YR8JQGypRcwv5ftNzOclVCaUzyiMrm2Qhb4';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runMigration() {
  try {
    console.log('Running migration: 039_add_dispatch_company_support.sql\n');
    
    const sql = readFileSync('supabase_migrations/039_add_dispatch_company_support.sql', 'utf8');
    
    // Extract SQL statements (excluding comments)
    // We need to preserve DO blocks and multi-line statements
    const sqlStatements = sql
      .split(/;\s*(?=\n|$)/)
      .map(s => s.trim())
      .filter(s => {
        const trimmed = s.trim();
        return trimmed && 
               !trimmed.startsWith('--') && 
               trimmed.length > 0 &&
               !trimmed.match(/^--/m); // Filter out comment-only lines
      });
    
    if (sqlStatements.length === 0) {
      console.log('⚠️  Migration file contains only comments. No SQL to execute.');
      console.log('\nThe migration is optional - existing RLS policies already support dispatch_company role.');
      console.log('The only change would be updating the table comment.');
      return;
    }
    
    for (const statement of sqlStatements) {
      if (statement.trim()) {
        console.log('Executing:', statement.substring(0, 80) + '...');
        
        // Try to execute via RPC if available, otherwise provide manual instructions
        try {
          const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
          if (error) {
            // RPC might not be available, provide manual instructions
            if (error.message.includes('exec_sql') || error.message.includes('function') || error.message.includes('does not exist')) {
              console.log('\n⚠️  Cannot execute SQL directly due to RLS policies.');
              console.log('Please run this migration manually in Supabase SQL Editor:\n');
              console.log('SQL to execute:');
              console.log('='.repeat(70));
              sqlStatements.forEach(stmt => console.log(stmt + ';'));
              console.log('='.repeat(70));
              console.log('\nSteps:');
              console.log('1. Go to https://supabase.com/dashboard');
              console.log('2. Select your project');
              console.log('3. Go to SQL Editor');
              console.log('4. Copy and paste the SQL above');
              console.log('5. Click Run');
              return;
            }
            throw error;
          }
          console.log('✅ Statement executed successfully');
        } catch (rpcError) {
          // If RPC fails, try direct execution (this will likely fail due to RLS)
          console.log('\n⚠️  Cannot execute SQL directly due to RLS policies.');
          console.log('Please run this migration manually in Supabase SQL Editor:\n');
          console.log('SQL to execute:');
          console.log('='.repeat(70));
          sqlStatements.forEach(stmt => console.log(stmt + ';'));
          console.log('='.repeat(70));
          console.log('\nSteps:');
          console.log('1. Go to https://supabase.com/dashboard');
          console.log('2. Select your project');
          console.log('3. Go to SQL Editor');
          console.log('4. Copy and paste the SQL above');
          console.log('5. Click Run');
          return;
        }
      }
    }
    
    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Error running migration:', error.message);
    console.error('\nPlease run this migration manually in Supabase SQL Editor:');
    console.error('1. Go to https://supabase.com/dashboard');
    console.error('2. Select your project');
    console.error('3. Go to SQL Editor');
    console.error('4. Copy and paste the contents of: supabase_migrations/039_add_dispatch_company_support.sql');
    console.error('5. Click Run');
  }
}

runMigration();

