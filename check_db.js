const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vszfhpbvzzxijcrrnclh.supabase.co';
const supabaseKey = 'sb_publishable_-k-cgjWWtBqotpk49mGuQg_8pr3UAWu';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDB() {
  console.log('=== CHECKING PROFILES ===');
  const { data: profiles } = await supabase.from('profiles').select('*');
  console.log('Profiles:', JSON.stringify(profiles, null, 2));

  console.log('\n=== CHECKING BRANCHES ===');
  const { data: branches } = await supabase.from('branches').select('*');
  console.log('Branches:', JSON.stringify(branches, null, 2));

  console.log('\n=== CHECKING COACHING_SESSIONS ===');
  const { data: sessions } = await supabase.from('coaching_sessions').select('*').limit(5);
  console.log('Sessions:', JSON.stringify(sessions, null, 2));
}

checkDB();
