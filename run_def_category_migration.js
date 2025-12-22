// Script to run the Def expense category migration
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cwkaqyxbughjtkbukliq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3a2FxeXhidWdoanRrYnVrbGlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5MDQwMzQsImV4cCI6MjA4MDQ4MDAzNH0.pcO7hab0YR8JQGypRcwv5ftNzOclVCaUzyiMrm2Qhb4';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runMigration() {
  try {
    console.log('Adding "Def" expense category...\n');
    
    // Try to insert the category
    const { data, error } = await supabase
      .from('expense_categories')
      .insert({
        name: 'Def',
        description: 'DEF (Diesel Exhaust Fluid) expenses',
        icon: 'droplet',
        color: '#3B82F6'
      })
      .select();
    
    if (error) {
      if (error.code === '23505' || error.message.includes('duplicate') || error.message.includes('unique')) {
        console.log('✅ Category "Def" already exists. Migration skipped.');
        return;
      }
      // If RLS prevents insert, provide manual instructions
      if (error.code === '42501' || error.message.includes('permission') || error.message.includes('policy')) {
        console.log('⚠️  Cannot insert category due to RLS policies.');
        console.log('Please run this SQL manually in Supabase SQL Editor:\n');
        console.log('INSERT INTO expense_categories (name, description, icon, color) VALUES');
        console.log("  ('Def', 'DEF (Diesel Exhaust Fluid) expenses', 'droplet', '#3B82F6')");
        console.log('ON CONFLICT (name) DO NOTHING;\n');
        console.log('Steps:');
        console.log('1. Go to https://supabase.com/dashboard');
        console.log('2. Select your project');
        console.log('3. Go to SQL Editor');
        console.log('4. Copy and paste the INSERT statement above');
        console.log('5. Click Run');
        return;
      }
      throw error;
    }
    
    console.log('✅ Migration completed successfully!');
    console.log('Added category:', data);
  } catch (error) {
    console.error('❌ Error running migration:', error.message);
    console.error('\nPlease run this migration manually in Supabase SQL Editor:');
    console.error('1. Go to https://supabase.com/dashboard');
    console.error('2. Select your project');
    console.error('3. Go to SQL Editor');
    console.error('4. Copy and paste the contents of: supabase_migrations/038_add_def_expense_category.sql');
    console.error('5. Click Run');
  }
}

runMigration();
