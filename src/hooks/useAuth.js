import { useEffect, useState } from 'react';
import { authService } from '../services/authService';
import { userService } from '../services/userService';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // Listen for auth changes
    const subscription = authService.onAuthStateChange(async (currentUser) => {
      if (!isMounted) return;
      
      setUser(currentUser);

      if (currentUser) {
        const { data: userProfile } = await userService.getUserProfile(currentUser.id);
        if (isMounted) setProfile(userProfile);
      } else {
        if (isMounted) setProfile(null);
      }
      
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
      if (subscription?.unsubscribe) subscription.unsubscribe();
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
