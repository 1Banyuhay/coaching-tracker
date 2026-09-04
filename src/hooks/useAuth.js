import { useState, useEffect } from 'react';
import { supabaseClient } from '../config/supabase';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        if (session?.user && mounted) {
          setUser(session.user);
          const { data: profileData } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          if (mounted) {
            setProfile(profileData);
          }
        }
        
        if (mounted) {
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    checkAuth();

    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (session?.user) {
          setUser(session.user);
          const { data: profileData } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          if (mounted) {
            setProfile(profileData);
            setLoading(false);
          }
        } else {
          if (mounted) {
            setUser(null);
            setProfile(null);
            setLoading(false);
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    return data;
  };

  const logout = async () => {
    await supabaseClient.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return {
    user,
    profile,
    loading,
    login,
    isAuthenticated: !!user && !!profile,
    role: profile?.role || null,
    logout
  };
};
