import { supabase } from '../config/supabase';

export const authService = {
  signout: async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }
};
