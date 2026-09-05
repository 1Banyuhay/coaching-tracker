import { useState, useEffect } from 'react';
import { supabaseClient } from '../config/supabase';
import { verifyPassword, isHashed, hashPassword } from '../utils/passwordHash';

export const useAuth = () => {
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
    updateStoredUser
  };
};
