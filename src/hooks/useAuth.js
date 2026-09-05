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
    const { data, error } = await supabaseClient
      .from('coaching_users')
      .select('*')
      .eq('username', username);

    if (error) throw error;
    if (!data || data.length === 0) throw new Error('User not found');

    const user = data[0];
    if (user.password !== password) throw new Error('Invalid password');

    setUser(user);
    localStorage.setItem('coachingUser', JSON.stringify(user));
    return { user };
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
