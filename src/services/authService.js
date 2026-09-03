import { supabase } from '../config/supabase';

export const authService = {
  signin: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  getCurrentUser: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  onAuthStateChange: (callback) => {
    return supabase.auth.onAuthStateChange(callback);
  },

  signOut: async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }
};
