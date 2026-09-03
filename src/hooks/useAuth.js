import { useState, useEffect } from 'react';
import { supabaseClient } from '../config/supabase';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    console.log('=== useAuth useEffect starting ===');
    
    // Check if session already exists in storage
    supabaseClient.auth.getSession().then(({ data }) => {
      console.log('getSession returned:', data);
    });

    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      async (event, session) => {
        console.log('=== onAuthStateChange fired ===');
        console.log('Event:', event);
        console.log('Session:', session);

        if (!mounted) return;

        if (session?.user) {
          console.log('User found, loading profile...');
          setUser(session.user);

          const { data: profileData, error: profileError } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          console.log('Profile result:', { profileData, profileError });

          if (mounted) {
            if (profileError) {
              console.error('Profile error:', profileError);
              setError(profileError.message);
              setProfile(null);
            } else {
              console.log('Profile loaded successfully:', profileData);
              setProfile(profileData);
              setError(null);
            }
            setLoading(false);
          }
        } else {
          console.log('No session, clearing auth state');
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await supabaseClient.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return { user, profile, loading, error, logout };
};
