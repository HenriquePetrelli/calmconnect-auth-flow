import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type UserType = 'admin' | 'psychologist' | 'patient' | 'unknown';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userType: UserType;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUserType: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to clean auth state completely
const cleanupAuthState = () => {
  localStorage.removeItem('supabase.auth.token');
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      localStorage.removeItem(key);
    }
  });
  Object.keys(sessionStorage || {}).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      sessionStorage.removeItem(key);
    }
  });
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userType, setUserType] = useState<UserType>('unknown');
  const [loading, setLoading] = useState(true);

  const getUserType = async (userId: string): Promise<UserType> => {
    try {
      // Check if admin
      const { data: adminData } = await supabase
        .from('admin_users')
        .select('is_active')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (adminData) return 'admin';

      // Check profile for psychologist/patient
      const { data: profileData } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('user_id', userId)
        .single();

      if (profileData?.user_type === 'psychologist') return 'psychologist';
      if (profileData?.user_type === 'patient') return 'patient';

      return 'unknown';
    } catch (error) {
      console.error('Error determining user type:', error);
      return 'unknown';
    }
  };

  const refreshUserType = async () => {
    if (user?.id) {
      const type = await getUserType(user.id);
      setUserType(type);
    }
  };

  const handleAuthStateChange = async (event: string, session: Session | null) => {
    // Auth state changed (removed sensitive logging)
    
    setSession(session);
    setUser(session?.user ?? null);

    if (session?.user) {
      // Defer user type determination to prevent deadlocks
      setTimeout(async () => {
        try {
          const type = await getUserType(session.user.id);
          setUserType(type);
        } catch (error) {
          console.error('Error getting user type:', error);
          setUserType('unknown');
        }
      }, 0);
    } else {
      setUserType('unknown');
    }

    setLoading(false);
  };

  const signOut = async () => {
    try {
      cleanupAuthState();
      await supabase.auth.signOut({ scope: 'global' });
      // Force page reload for clean state
      window.location.href = '/';
    } catch (error) {
      console.error('Sign out error:', error);
      // Force reload even if sign out fails
      window.location.href = '/';
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthStateChange('INITIAL_SESSION', session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Route protection effect
  useEffect(() => {
    if (!loading && user && userType !== 'unknown') {
      const currentPath = window.location.pathname;
      
      // Define redirect rules based on user type and current path
      if (userType === 'admin') {
        if (!currentPath.startsWith('/admin')) {
          // Admin user redirected to admin dashboard
          window.location.href = '/admin-dashboard';
        }
      } else if (userType === 'psychologist') {
        if (currentPath.startsWith('/admin')) {
          // Psychologist user blocked from admin area
          window.location.href = '/psychologist-dashboard';
        }
      } else if (userType === 'patient') {
        if (currentPath.startsWith('/admin') || currentPath.startsWith('/psychologist')) {
          // Patient user blocked from restricted area
          window.location.href = '/';
        }
      }
    }
  }, [user, userType, loading]);

  const value: AuthContextType = {
    user,
    session,
    userType,
    loading,
    signOut,
    refreshUserType,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};