import { supabaseClient } from '../config/supabase';

export const authService = {
  async login(email, password) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  async logout() {
    return await supabaseClient.auth.signOut();
  },

  async getSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    return session;
  },

  async getUser() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    return user;
  },

  onAuthStateChange(callback) {
    return supabaseClient.auth.onAuthStateChange(callback);
  },
};
