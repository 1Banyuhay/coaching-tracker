import { createClient } from '@supabase/supabase-js';

console.log('REACT_APP_SUPABASE_URL:', process.env.REACT_APP_SUPABASE_URL);
console.log('REACT_APP_SUPABASE_ANON_KEY:', process.env.REACT_APP_SUPABASE_ANON_KEY);

const supabaseUrl = 'https://vszfhpbvzzxijcrrnclh.supabase.co';
const supabaseAnonKey = 'sb_publishable_-k-cgjWWtBqotpk49mGuQg_8pr3UAWu';

console.log('Using supabaseUrl:', supabaseUrl);
console.log('Using supabaseAnonKey:', supabaseAnonKey?.substring(0, 20) + '...');

export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
