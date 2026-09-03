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
        // Set up auth state listener FIRST - this initializes the session
        const { data: subscription } = authService.onAuthStateChange(async (currentUser) => {
          if (!isMounted) return;
          
          setUser(currentUser);

          if (currentUser) {
            try {
              const { data: userProfile } = await userService.getUserProfile(currentUser.id);
              if (isMounted) {
                setProfile(userProfile);
              }
            } catch (err) {
              console.error('Error loading profile:', err);
              if (isMounted) setError(err);
            }
          } else {
            if (isMounted) setProfile(null);
          }
          
          if (isMounted) setLoading(false);
        });

        // Cleanup
        return () => {
          isMounted = false;
          if (subscription?.unsubscribe) {
            subscription.unsubscribe();
          }
        };
      } catch (err) {
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
