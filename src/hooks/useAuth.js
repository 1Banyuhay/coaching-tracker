import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabaseClient } from '../config/supabase';
import { verifyPassword, isHashed, hashPassword } from '../utils/passwordHash';

// A real Context, not just a plain hook - every component that calls
// useAuth() shares ONE user/loading state instead of each keeping its own
// separate copy. That matters the moment something changes it from
// somewhere other than where App.js reads it: e.g. logging out from the
// Navbar used to only update the Navbar's own private copy of `user`,
// leaving App.js still thinking someone was logged in (so it kept
// rendering the authenticated router, which has no /login route at all,
// instead of dropping back to the login screen).
const AuthContext = createContext(null);

function useProvideAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('coachingUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    console.log('Login called with username:', username);
    try {
      const { data, error } = await supabaseClient
        .from('coaching_users')
        .select('*')
        .eq('username', username);

      console.log('Query result:', { data, error });

      if (error) {
        console.error('Query error:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.log('No users found');
        throw new Error('User not found');
      }

      let user = data[0];
      console.log('User found:', user.username);

      let passwordOk = false;
      if (isHashed(user.password)) {
        passwordOk = await verifyPassword(password, user.password);
      } else {
        // Legacy row created before password hashing existed: its
        // password column is still the plain text value. Compare
        // directly, and - only on a successful match - transparently
        // upgrade the stored value to a proper hash so this row never
        // needs to be checked in plain text again.
        passwordOk = user.password === password;
        if (passwordOk) {
          try {
            const newHash = await hashPassword(password);
            const { error: migrateError } = await supabaseClient
              .from('coaching_users')
              .update({ password: newHash })
              .eq('id', user.id);
            if (!migrateError) {
              user = { ...user, password: newHash };
            }
          } catch (migrateErr) {
            console.error('Password migration error:', migrateErr);
            // Non-fatal: login still succeeds even if the silent
            // upgrade fails, the row just stays plain text for now.
          }
        }
      }

      if (!passwordOk) {
        console.log('Password mismatch');
        throw new Error('Invalid password');
      }

      // Checked after the password so a wrong guess never reveals whether
      // an account has been deactivated - only someone who already knows
      // the password learns that.
      if (user.status === 'inactive') {
        console.log('Account is deactivated');
        throw new Error('This account has been deactivated. Contact your administrator.');
      }

      console.log('Login successful!');
      setUser(user);
      localStorage.setItem('coachingUser', JSON.stringify(user));
      return { user };
    } catch (err) {
      console.error('Login error caught:', err.message);
      throw err;
    }
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem('coachingUser');
  };

  // Merge partial updates into the cached user (e.g. after a password
  // change) without requiring a full re-login.
  const updateStoredUser = (updates) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...updates };
      localStorage.setItem('coachingUser', JSON.stringify(next));
      return next;
    });
  };

  return {
    user,
    loading,
    login,
    isAuthenticated: !!user,
    role: user?.role || null,
    logout,
    updateStoredUser,
  };
}

export const AuthProvider = ({ children }) => {
  const auth = useProvideAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
