import { supabase, getCurrentUser } from './supabaseClient';

export const authService = {
  // Sign up (for admin-only user creation in production)
  signup: async (email, password, firstName, lastName) => {
    try {
      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          },
        },
      });

      if (signupError) throw signupError;

      // Create profile entry
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          email,
          first_name: firstName,
          last_name: lastName,
          role: 'planner', // Default role
        });

      if (profileError) throw profileError;

      return { user: data.user, error: null };
    } catch (error) {
      return { user: null, error };
    }
  },

  // Sign in
  signin: async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { user: data.user, error: null };
    } catch (error) {
      return { user: null, error };
    }
  },

  // Get current user
  getCurrentUser,

  // Reset password
  resetPassword: async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
      window.location.href = "/login";
    return { error: null };
    } catch (error) {
      return { error };
    }
  },

  // Update password
  updatePassword: async (newPassword) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;
      window.location.href = "/login";
    return { error: null };
    } catch (error) {
      return { error };
    }
  },

  // Set up auth state listener
  onAuthStateChange: (callback) => {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(session?.user ?? null, event);
    });
  },
};
