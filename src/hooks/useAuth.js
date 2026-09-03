import { useEffect, useState } from 'react';
import { authService } from '../services/authService';
import { userService } from '../services/userService';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if user is logged in
    const initializeAuth = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);

        if (currentUser) {
          const { data: userProfile, error: profileError } = await userService.getUserProfile(currentUser.id);
          if (profileError) throw profileError;
          setProfile(userProfile);
        }
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    // Set up auth listener
    const { data: subscription } = authService.onAuthStateChange(async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        const { data: userProfile } = await userService.getUserProfile(currentUser.id);
        setProfile(userProfile);
      } else {
        setProfile(null);
      }
    });

    initializeAuth();

    // Cleanup
    return () => {
      if (subscription) {
        subscription.unsubscribe?.();
      }
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
