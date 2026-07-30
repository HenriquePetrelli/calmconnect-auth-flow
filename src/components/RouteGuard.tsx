import { useEffect, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import SplashScreen from '@/components/SplashScreen';
import { supabase } from '@/integrations/supabase/client';
import { isCurrentlyBlocked, notifyBlockedAccess } from '@/utils/psychologistBlock';


interface RouteGuardProps {
  children: ReactNode;
  allowedUserTypes: ('patient' | 'psychologist' | 'admin' | 'public')[];
  redirectTo?: string;
}

// Definição das rotas por tipo de usuário
export const ROUTE_PERMISSIONS = {
  public: [
    '/',
    '/signup-type',
    '/patient-signup',
    '/psychologist-signup'
  ],
  patient: [
    '/home',
    '/support-groups',
    '/support-group/:groupId',
    '/journal',
    '/sounds',
    '/sounds/category',
    '/sounds/subcategory', 
    '/sounds/player',
    '/sounds/feedback',
    '/breathing',
    '/sos',
    '/profile',
    '/account-settings',
    '/appointments',
    '/notifications',
    '/statistics',
    '/statistics/activity-history',
    '/goals',
    '/progress',
    '/achievements',
    '/subscription-plans',
    '/subscription-success',
    '/subscription-cancel',
    '/webrtc-test',
    '/chat', // chat disponível para pacientes
    '/emergency-call', // paciente e psicólogo podem acessar
    '/emergency-call/', // rotas com parâmetros
    '/emergency/call', // rota legacy para psicólogo
    '/paciente/suporte' // suporte para pacientes
  ],
  psychologist: [
    '/psychologist-dashboard',
    '/psychologist-profile',
    '/psychologist-payments',
    '/chat', // chat disponível para psicólogos
    '/emergency-call', // psicólogo pode atender chamada
    '/emergency-call/', // rotas com parâmetros
    '/emergency/call', // rota legacy
    '/emergency/call/', // rotas com parâmetros legacy
    '/psicologo/suporte' // suporte para psicólogos
  ],
  admin: [
    '/admin-dashboard'
  ]
};

// URLs de redirecionamento por tipo de usuário
const REDIRECT_URLS = {
  patient: '/',
  psychologist: '/',
  admin: '/',
  public: '/'
};

// Função para verificar se a rota é permitida para o tipo de usuário
const isRouteAllowed = (pathname: string, userType: string): boolean => {
  const routes = ROUTE_PERMISSIONS[userType as keyof typeof ROUTE_PERMISSIONS] || [];
  
  // Verificação exata da rota
  if (routes.includes(pathname)) {
    return true;
  }
  
  // Verificação para rotas com parâmetros dinâmicos
  return routes.some(route => {
    // Para rotas que terminam com '/', verificar se o pathname começa com elas
    if (route.endsWith('/')) {
      return pathname.startsWith(route);
    }
    
    // Para rotas específicas como /sounds/category, /sounds/player, etc.
    if (route.includes('/category') && pathname.includes('/category/')) return true;
    if (route.includes('/subcategory') && pathname.includes('/subcategory/')) return true;
    if (route.includes('/player') && pathname.includes('/player/')) return true;
    if (route.includes('/emergency-call') && pathname.startsWith('/emergency-call/')) return true;
    if (route.includes('/emergency/call') && pathname.startsWith('/emergency/call/')) return true;
    if (route.includes('/support-group/') && pathname.startsWith('/support-group/')) return true;
    
    return false;
  });
};

// Limpa qualquer rota persistida legada (lógica antiga causava redirects indevidos)
const clearLegacyLastRoute = () => {
  try {
    localStorage.removeItem('lastRoute');
    localStorage.removeItem('lastUserType');
  } catch {}
};
clearLegacyLastRoute();

const RouteGuard: React.FC<RouteGuardProps> = ({ 
  children, 
  allowedUserTypes, 
  redirectTo 
}) => {
  const { user, userType, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isPublicRoute = allowedUserTypes.includes('public');

  // Bloqueio administrativo: encerra sessão de psicólogos bloqueados
  useEffect(() => {
    // Em rotas públicas, o LoginForm já trata o bloqueio.
    // Evita dois alertas concorrentes durante o login.
    if (isPublicRoute) return;
    if (!user || userType !== 'psychologist') return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('psychologists')
        .select('is_blocked, blocked_until, blocked_reason')
        .eq('user_id', user.id)
        .maybeSingle();
      if (cancelled || !data || !isCurrentlyBlocked(data as any)) return;
      await notifyBlockedAccess(data as any);
      await supabase.auth.signOut();

      navigate('/', { replace: true });
    })();
    return () => { cancelled = true; };
  }, [user?.id, userType, navigate, isPublicRoute]);


  // Computa permissão de acesso de forma síncrona para evitar
  // renderizar a página protegida (que poderia disparar seus próprios redirects)
  const currentPath = location.pathname;

  let accessState: 'loading' | 'allowed' | 'denied' = 'loading';
  let redirectTarget: string | null = null;

  if (!loading) {
    if (!user) {
      if (isPublicRoute) {
        accessState = 'allowed';
      } else {
        accessState = 'denied';
        redirectTarget = redirectTo || '/';
      }
    } else if (userType === 'unknown') {
      // Aguarda resolução do tipo
      accessState = 'loading';
    } else if (!allowedUserTypes.includes(userType as any)) {
      accessState = 'denied';
      redirectTarget = redirectTo || getDefaultRouteForUserType(userType);
    } else if (!isRouteAllowed(currentPath, userType)) {
      accessState = 'denied';
      redirectTarget = getDefaultRouteForUserType(userType);
    } else {
      accessState = 'allowed';
    }
  }

  useEffect(() => {
    if (accessState === 'denied' && redirectTarget && redirectTarget !== currentPath) {
      navigate(redirectTarget, { replace: true });
    }
  }, [accessState, redirectTarget, currentPath, navigate]);

  if (accessState !== 'allowed') {
    if (isPublicRoute) {
      return <SplashScreen />;
    }
    return <SplashScreen />;
  }

  return <>{children}</>;
};

// Função auxiliar para obter rota padrão por tipo de usuário
const getDefaultRouteForUserType = (userType: string): string => {
  switch (userType) {
    case 'patient':
      return '/home';
    case 'psychologist':
      return '/psychologist-dashboard';
    case 'admin':
      return '/admin-dashboard';
    default:
      return '/';
  }
};

export default RouteGuard;