// Script to run driver pay configuration migration
// This script will display the SQL that needs to be run in Supabase SQL Editor

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const migrationFile = join(__dirname, 'supabase/migrations/20251219174951_add_driver_pay_config.sql');

try {
  const sql = readFileSync(migrationFile, 'utf8');
  
  console.log('='.repeat(70));
  console.log('📋 DRIVER PAY CONFIGURATION MIGRATION');
  console.log('='.repeat(70));
  console.log('');
  console.log('This migration adds pay_type and pay_percentage columns to the drivers table.');
  console.log('');
  console.log('📝 To run this migration:');
  console.log('');
  console.log('1. Go to https://supabase.com/dashboard');
  console.log('2. Select your project (cwkaqyxbughjtkbukliq)');
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
  console.log('✅ After running, verify in Table Editor that drivers table has:');
  console.log('   - pay_type column (TEXT, default: percentage_of_net)');
  console.log('   - pay_percentage column (NUMERIC, default: 50.00)');
  console.log('');
} catch (error) {
  console.error('❌ Error reading migration file:', error.message);
  process.exit(1);
}
