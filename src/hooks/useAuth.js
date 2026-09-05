import { useState, useEffect } from 'react';
import { supabaseClient } from '../config/supabase';

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

      const user = data[0];
      console.log('User found:', user.username);
      
      if (user.password !== password) {
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

  return {
    user,
    loading,
    login,
    isAuthenticated: !!user,
    role: user?.role || null,
    logout
  };
};
