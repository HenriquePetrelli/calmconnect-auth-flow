import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import logoImg from '@/assets/soliv-logo.webp';
import Wordmark from '@/components/Wordmark';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import { usePsychologistPresence } from '@/hooks/usePsychologistPresence';
import { cn } from '@/lib/utils';
import PsychologistSidebar from './PsychologistSidebar';
import PsychologistBottomNav from './PsychologistBottomNav';
import EmergencyAlertBanner from './EmergencyAlertBanner';
import { PSYCHOLOGIST_HOME } from './psychologistNav';

const NOTIFICATIONS_PATH = '/psychologist-notifications';

const NotificationBell = ({ className }: { className?: string }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { unreadCount } = useNotifications();
  const active = pathname === NOTIFICATIONS_PATH;
  return (
    <button
      type="button"
      className={cn(
        'relative flex h-10 w-10 items-center justify-center rounded-full transition-colors',
        active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground',
        className,
      )}
      onClick={() => navigate(NOTIFICATIONS_PATH)}
      aria-label={unreadCount > 0 ? `Notificações, ${unreadCount} não lidas` : 'Notificações'}
    >
      <Bell className="h-5 w-5" fill={active ? 'currentColor' : 'none'} />
      {unreadCount > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-xs font-semibold leading-none text-destructive-foreground">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
};

/**
 * Layout do psicólogo, no mesmo padrão do paciente: menu lateral no computador;
 * cabeçalho (perfil, marca, avisos) e barra inferior no celular e no tablet.
 * Fica montado entre as telas principais (Início, Consultas, Agenda, Chat,
 * Pagamentos, Perfil e Notificações), então a navegação não pisca.
 */
const PsychologistLayout = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { isOnline } = usePsychologistPresence();
  const firstName: string = (user?.user_metadata?.full_name || 'P').split(' ')[0];

  return (
    <div className="min-h-screen">
      <PsychologistSidebar />

      <div className="md:pl-64">
        {/* Celular e tablet */}
        <header className="fixed left-0 right-0 top-0 z-50 border-b border-border bg-card/80 shadow-sm backdrop-blur-md md:hidden">
          <div className="relative mx-auto flex h-16 items-center justify-between px-4">
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center"
              onClick={() => navigate('/psychologist-profile')}
              aria-label="Perfil"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                {firstName.charAt(0).toUpperCase()}
              </span>
            </button>
            <button
              type="button"
              className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2"
              onClick={() => navigate(PSYCHOLOGIST_HOME)}
              aria-label="Início"
            >
              <img src={logoImg} alt="" className="h-9 w-9 select-none object-contain" draggable={false} />
              <Wordmark className="h-[30px] text-primary" />
            </button>
            <NotificationBell />
          </div>
        </header>

        {/* Computador */}
        <header className="hidden border-b border-border bg-card/80 px-6 backdrop-blur-md md:block">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between">
            <span
              className={cn(
                'flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium',
                isOnline ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-muted text-muted-foreground',
              )}
            >
              <span className={cn('h-2 w-2 rounded-full', isOnline ? 'bg-emerald-500' : 'border border-muted-foreground/60')} aria-hidden="true" />
              {isOnline ? 'Online para SOS' : 'Offline para SOS'}
            </span>
            <Wordmark className="h-[30px] text-primary" />
            <NotificationBell />
          </div>
        </header>

        <main className="pb-24 pt-16 md:pb-10 md:pt-0">
          <div className="mx-auto w-full max-w-6xl space-y-4 px-4 py-4 sm:px-6 md:py-6 lg:px-8">
            {isOnline && pathname !== PSYCHOLOGIST_HOME && <EmergencyAlertBanner />}
            {children}
          </div>
        </main>
      </div>

      <PsychologistBottomNav />
    </div>
  );
};

export default PsychologistLayout;
