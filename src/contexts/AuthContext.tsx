import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { deactivateStoredPushToken } from '@/lib/pushToken';
import { goOfflineOnSignOut } from '@/hooks/usePsychologistPresence';
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
    // soliv:subscription: plano guardado para abrir mais rápido (SubscriptionContext).
    if (key.startsWith('supabase.auth.') || key.includes('sb-') || key.startsWith('soliv:subscription:')) {
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
      // user_metadata é editável pelo próprio usuário (supabase.auth.updateUser):
      // só serve de atalho para "paciente", nunca para dar mais acesso. Admin e
      // psicólogo aprovado vêm sempre do banco.
      // Fast path: user type já presente no JWT
      if (meta.user_type === 'patient' && meta.is_super_admin !== true) {
        console.log('[AuthContext] getUserType -> patient (meta)', { userId, email: authUser.email });
        return 'patient';
      }

      // As consultas não dependem umas das outras: em paralelo (login mais rápido).
      const [adminResult, rejectionResult, profileResult, registrationResult, psychologistResult] = await Promise.all([
        supabase.rpc('is_super_admin', { user_id_param: userId }),
        supabase.rpc('get_psychologist_rejection_status', { p_user_id: userId }),
        supabase.from('profiles').select('user_type').eq('user_id', userId).maybeSingle(),
        supabase.from('psychologist_registrations').select('status, rejected_at').eq('user_id', userId).maybeSingle(),
        supabase.from('psychologists').select('approved, approval_status').eq('user_id', userId).maybeSingle(),
      ]);

      if (!adminResult.error && adminResult.data === true) {
        console.log('[AuthContext] getUserType -> admin (admin_users)', { userId });
        return 'admin';
      }

      // Check if psychologist is rejected and show specific message
      const { data: rejectionStatus, error: rejectionError } = rejectionResult;

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
      const profileData = profileResult.data;

      if (profileData?.user_type === 'psychologist') {
        // For psychologists, check if approved (no banco, não no metadata)
        const registrationData = registrationResult.data;
        const psychologistRow = psychologistResult.data;

        if (
          registrationData?.status === 'approved' ||
          (psychologistRow?.approved === true && psychologistRow.approval_status === 'approved')
        ) {
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
    console.log('[AuthContext] event:', event);
    setSession(session);
    setUser(session?.user ?? null);

    if (session?.user) {
      const meta = session.user.user_metadata ?? {};

      // Paciente via metadata
      if (meta.user_type === 'patient' && meta.is_super_admin !== true) {
        console.log('[AuthContext] -> patient (fast path)');
        setUserType('patient');
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
    // While the session still exists: stop this device from receiving the
    // outgoing user's pushes (shared phones, handing the device over).
    try {
      await deactivateStoredPushToken();
    } catch {
      // segue saindo mesmo assim
    }
    // Psicólogo sai do SOS na hora (não fica "online" depois de sair).
    if (userType === 'psychologist' && user?.id) await goOfflineOnSignOut(user.id);
    try {
      // "global" encerra a sessão em todos os aparelhos. Se o servidor falhar
      // (rede, 5xx), o Supabase NÃO apaga a sessão local; aí a tela de login
      // via a pessoa ainda logada e voltava para o painel. "local" sempre apaga.
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) await supabase.auth.signOut({ scope: 'local' });
    } catch (error) {
      console.error('Sign out error:', error);
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch {
        // segue saindo mesmo assim
      }
    }
    cleanupAuthState();
    // Always reset to light mode on logout; dark mode is per-logged-in-user
    try {
      localStorage.setItem('theme', 'light');
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    } catch {
      // segue saindo mesmo assim
    }
    // Recarrega para começar do zero na tela de login
    window.location.href = '/';
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