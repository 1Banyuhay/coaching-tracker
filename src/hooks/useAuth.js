import { useEffect, useState } from 'react';
import { authService } from '../services/authService';
import { userService } from '../services/userService';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        // Set up auth state listener with correct destructuring
        const { data: { subscription }, error: subError } = authService.onAuthStateChange(async (currentUser) => {
          if (!isMounted) return;
          
          setUser(currentUser);

          if (currentUser) {
            try {
              const { data: userProfile } = await userService.getUserProfile(currentUser.id);
              if (isMounted && userProfile) {
                setProfile(userProfile);
              }
            } catch (err) {
              console.error('Error loading profile:', err);
            }
          } else {
            if (isMounted) setProfile(null);
          }
          
          if (isMounted) setLoading(false);
        });

        if (subError) throw subError;

        return () => {
          isMounted = false;
          if (subscription?.unsubscribe) {
            subscription.unsubscribe();
          }
        };
      } catch (err) {
        console.error('Auth init error:', err);
        if (isMounted) {
          setError(err);
          setLoading(false);
        }
      }
    };

    const cleanup = initializeAuth();
    return () => {
      if (cleanup) cleanup.then(fn => fn?.());
    };
  }, []);

  return {
    user,
    profile,
    loading,
    error,
    isAuthenticated: !!user,
    role: profile?.role,
    logout: authService.signOut,
  };
};
