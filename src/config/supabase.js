import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vszfhpbvzzxijcrrnclh.supabase.co';
const supabaseAnonKey = 'sb_publishable_-k-cgjWWtBqotpk49mGuQg_8pr3UAWu';

export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
