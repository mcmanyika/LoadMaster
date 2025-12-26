// Script to run migration 052: Allow dispatchers to view companies via associations
// This displays the SQL that needs to be run in Supabase SQL Editor

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const migrationFile = join(__dirname, 'supabase_migrations/052_allow_dispatchers_view_companies_via_associations.sql');

try {
  const sql = readFileSync(migrationFile, 'utf8');
  
  console.log('='.repeat(70));
  console.log('📋 MIGRATION 052: Allow Dispatchers to View Companies via Associations');
  console.log('='.repeat(70));
  console.log('');
  console.log('This migration updates the companies table RLS policy to allow dispatchers');
  console.log('to view companies they are associated with via dispatcher_company_associations.');
  console.log('This is needed for dispatchers to see company names when querying with joins.');
  console.log('');
  console.log('📝 To run this migration:');
  console.log('');
  console.log('1. Go to https://supabase.com/dashboard');
  console.log('2. Select your project');
  console.log('3. Navigate to SQL Editor (left sidebar)');
  console.log('4. Click "New query"');
  console.log('5. Copy and paste the SQL below');
  console.log('6. Click "Run" or press Cmd/Ctrl + Enter');
  console.log('');
  console.log('='.repeat(70));
  console.log('SQL TO EXECUTE:');
  console.log('='.repeat(70));
  console.log('');
  console.log(sql);
  console.log('');
  console.log('='.repeat(70));
  console.log('');
  console.log('✅ After running, verify that:');
  console.log('   - The policy "Users can view their company" exists on companies table');
  console.log('   - Dispatchers can now see company names in LoadForm modal');
  console.log('');
} catch (error) {
  console.error('❌ Error reading migration file:', error.message);
  process.exit(1);
}

