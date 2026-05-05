import { useEffect, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

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

  useEffect(() => {
    if (loading) return;

    const currentPath = location.pathname;

    // Se não há usuário logado
    if (!user) {
      // Permitir rotas públicas
      if (allowedUserTypes.includes('public')) {
        return;
      }
      
      // Para rotas protegidas, redirecionar para login apropriado
      if (redirectTo) {
        navigate(redirectTo);
      } else {
        // Redirecionar para login genérico sempre
        navigate('/');
      }
      return;
    }

    // Se usuário está logado mas tipo ainda é desconhecido
    if (userType === 'unknown') {
      return;
    }

    // Verificar se o tipo de usuário é permitido para esta rota
    if (!allowedUserTypes.includes(userType as any)) {
      // Redirecionar para a rota apropriada do usuário
      const userRedirect = redirectTo || getDefaultRouteForUserType(userType);
      navigate(userRedirect);
      return;
    }

    // Verificar permissões específicas da rota
    if (!isRouteAllowed(currentPath, userType)) {
      const userRedirect = getDefaultRouteForUserType(userType);
      navigate(userRedirect);
      return;
    }

  }, [user, userType, loading, location.pathname, navigate, allowedUserTypes, redirectTo]);


  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
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