import { useEffect, useState } from 'react';
import { authService } from '../services/authService';
import { userService } from '../services/userService';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe;

    const initAuth = async () => {
      // Get the current session
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);

      if (currentUser) {
        const { data: userProfile } = await userService.getUserProfile(currentUser.id);
        setProfile(userProfile);
      }

      setLoading(false);

      // Subscribe to auth changes for future updates
      unsubscribe = authService.onAuthStateChange(async (authUser) => {
        setUser(authUser);
        if (authUser) {
          const { data: userProfile } = await userService.getUserProfile(authUser.id);
          setProfile(userProfile);
        } else {
          setProfile(null);
        }
      });
    };

    initAuth();

    return () => {
      if (unsubscribe?.unsubscribe) {
        unsubscribe.unsubscribe();
      }
    };
  }, []);

  return {
    user,
    profile,
    loading,
    isAuthenticated: !!user,
    role: profile?.role,
    logout: authService.signOut,
  };
};
