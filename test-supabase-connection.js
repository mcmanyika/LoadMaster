// Test Supabase connection and data access
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';

// Load environment variables
dotenv.config({ path: '.env' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://cwkaqyxbughjtkbukliq.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_ANON_KEY) {
  console.error('❌ Error: VITE_SUPABASE_ANON_KEY not found in environment');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testConnection() {
  console.log('🔍 Testing Supabase Connection...\n');
  console.log('URL:', SUPABASE_URL);
  console.log('Anon Key:', SUPABASE_ANON_KEY.substring(0, 20) + '...\n');

  try {
    // Test 1: Check authentication
    console.log('1️⃣ Testing authentication...');
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError) {
      console.error('   ❌ Auth error:', authError.message);
    } else {
      console.log('   ✅ Auth check passed');
      console.log('   Session:', session ? 'Active' : 'No active session');
      if (session) {
        console.log('   User ID:', session.user.id);
        console.log('   User Email:', session.user.email);
      }
    }

    // Test 2: Query profiles table
    console.log('\n2️⃣ Testing profiles table access...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, role, company_id')
      .limit(5);

    if (profilesError) {
      console.error('   ❌ Profiles query error:', profilesError.message);
      console.error('   Error details:', profilesError);
    } else {
      console.log('   ✅ Profiles query successful');
      console.log('   Found', profiles?.length || 0, 'profiles');
      if (profiles && profiles.length > 0) {
        console.log('   Sample profile:', profiles[0]);
      }
    }

    // Test 3: Query companies table
    console.log('\n3️⃣ Testing companies table access...');
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name, owner_id')
      .limit(5);

    if (companiesError) {
      console.error('   ❌ Companies query error:', companiesError.message);
      console.error('   Error details:', companiesError);
    } else {
      console.log('   ✅ Companies query successful');
      console.log('   Found', companies?.length || 0, 'companies');
      if (companies && companies.length > 0) {
        console.log('   Sample company:', companies[0]);
      }
    }

    // Test 4: Query dispatcher_company_associations
    console.log('\n4️⃣ Testing dispatcher_company_associations table access...');
    const { data: associations, error: associationsError } = await supabase
      .from('dispatcher_company_associations')
      .select('id, dispatcher_id, company_id, status, invite_code')
      .limit(5);

    if (associationsError) {
      console.error('   ❌ Associations query error:', associationsError.message);
      console.error('   Error details:', associationsError);
    } else {
      console.log('   ✅ Associations query successful');
      console.log('   Found', associations?.length || 0, 'associations');
      if (associations && associations.length > 0) {
        console.log('   Sample association:', associations[0]);
      }
    }

    // Test 5: Test can_view_company_by_association function
    if (session?.user?.id) {
      console.log('\n5️⃣ Testing can_view_company_by_association function...');
      if (companies && companies.length > 0) {
        const testCompanyId = companies[0].id;
        const { data: functionResult, error: functionError } = await supabase
          .rpc('can_view_company_by_association', { company_id_param: testCompanyId });

        if (functionError) {
          console.error('   ❌ Function error:', functionError.message);
          console.error('   Error details:', functionError);
        } else {
          console.log('   ✅ Function executed successfully');
          console.log('   Result:', functionResult);
        }
      }
    }

    // Test 6: Query loads table
    console.log('\n6️⃣ Testing loads table access...');
    const { data: loads, error: loadsError } = await supabase
      .from('loads')
      .select('id, origin, destination, rate')
      .limit(5);

    if (loadsError) {
      console.error('   ❌ Loads query error:', loadsError.message);
      console.error('   Error details:', loadsError);
    } else {
      console.log('   ✅ Loads query successful');
      console.log('   Found', loads?.length || 0, 'loads');
    }

    console.log('\n✅ Connection test complete!');

  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
    console.error('Stack:', error.stack);
  }
}

testConnection();

