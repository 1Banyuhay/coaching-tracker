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
    const { data } = supabase.auth.onAuthStateChange(callback);
    return data;
  },

  signOut: async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }
};
