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

  const getUserType = async (authUser: User): Promise<UserType> => {
    const userId = authUser.id;
    const meta = authUser.user_metadata ?? {};

    try {
      // Super admin (flag legada de metadata)
      if (meta.is_super_admin === true) {
        console.log('[AuthContext] getUserType -> admin (is_super_admin meta)', { userId, email: authUser.email });
        return 'admin';
      }

      // Fast path: user type já presente no JWT
      if (meta.user_type === 'patient') {
        console.log('[AuthContext] getUserType -> patient (meta)', { userId, email: authUser.email });
        return 'patient';
      }
      if (
        meta.user_type === 'psychologist' &&
        meta.account_status === 'approved'
      ) {
        return 'psychologist';
      }

      // Check if user is a super admin (admin_users table)
      try {
        const { data: isAdminData, error: isAdminError } = await supabase
          .rpc('is_super_admin', { user_id_param: userId });
        if (!isAdminError && isAdminData === true) {
          console.log('[AuthContext] getUserType -> admin (admin_users)', { userId });
          return 'admin';
        }
      } catch (e) {
        console.warn('[AuthContext] is_super_admin check failed', e);
      }

      // Check if psychologist is rejected and show specific message
      const { data: rejectionStatus, error: rejectionError } = await supabase
        .rpc('get_psychologist_rejection_status', { p_user_id: userId });

      if (!rejectionError && rejectionStatus?.[0]?.is_rejected) {
        const rejectionData = rejectionStatus[0];
        
        if (rejectionData.should_show_rejection_message) {
          // Show rejection message for 3 days
          toast.error("Seu cadastro foi recusado. O motivo foi enviado para o seu e-mail.");
          return 'unknown';
        }
        
        if (rejectionData.should_cleanup) {
          // User should have been cleaned up by now, but just in case
          return 'unknown';
        }
      }

      // Check profile for psychologist/patient
      const { data: profileData } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('user_id', userId)
        .single();

      if (profileData?.user_type === 'psychologist') {
        // For psychologists, check if approved
        const { data: registrationData } = await supabase
          .from('psychologist_registrations')
          .select('status, rejected_at')
          .eq('user_id', userId)
          .single();

        if (registrationData?.status === 'approved' || authUser.user_metadata?.account_status === 'approved') {
          return 'psychologist';
        }
        
        // Check if rejected and still within 3 days
        if (registrationData?.status === 'rejected' && registrationData?.rejected_at) {
          const rejectedDate = new Date(registrationData.rejected_at);
          const daysSinceRejection = Math.floor((Date.now() - rejectedDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysSinceRejection <= 3) {
            // Still within 3 days, show rejection message
            return 'unknown';
          }
        }
        
        return 'unknown'; // Not approved yet or rejected beyond 3 days
      }

      if (profileData?.user_type === 'patient') return 'patient';

      return 'unknown';
    } catch (error) {
      console.error('Error determining user type:', error);
      return 'unknown';
    }
  };

  const refreshUserType = async () => {
    if (user) {
      const type = await getUserType(user);
      setUserType(type);
    }
  };

  const handleAuthStateChange = async (event: string, session: Session | null) => {
    console.log('[AuthContext] event:', event, 'user:', session?.user?.email, 'meta:', session?.user?.user_metadata);
    setSession(session);
    setUser(session?.user ?? null);

    if (session?.user) {
      const meta = session.user.user_metadata ?? {};

      // Super admin via metadata (precedência máxima)
      if (meta.is_super_admin === true) {
        console.log('[AuthContext] -> admin (fast path)');
        setUserType('admin');
        setLoading(false);
        return;
      }

      // Paciente via metadata
      if (meta.user_type === 'patient') {
        console.log('[AuthContext] -> patient (fast path)');
        setUserType('patient');
        setLoading(false);
        return;
      }

      // Psicólogo aprovado via metadata
      if (
        meta.user_type === 'psychologist' &&
        meta.account_status === 'approved'
      ) {
        console.log('[AuthContext] -> psychologist (fast path)');
        setUserType('psychologist');
        setLoading(false);
        return;
      }

      try {
        const type = await getUserType(session.user);
        console.log('[AuthContext] -> resolved via DB:', type);
        setUserType(type);
      } catch (error) {
        console.error('Error getting user type:', error);
        setUserType('unknown');
      }
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
    // 1. Listener para mudanças futuras (login/logout/refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    // 2. Restaura sessão existente do storage IMEDIATAMENTE
    //    (necessário porque INITIAL_SESSION nem sempre dispara antes do primeiro render)
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthStateChange('INITIAL_SESSION', session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Route protection effect
  useEffect(() => {
    // Route protection is now handled by RouteGuard component
    // This effect is no longer needed to prevent conflicts
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