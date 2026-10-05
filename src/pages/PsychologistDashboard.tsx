import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, Calendar, History, AlertTriangle, Clock, Users } from 'lucide-react';
import PsychologistAccountMenu from '@/components/psychologist/PsychologistAccountMenu';
import Wordmark from '@/components/Wordmark';
import { supabase } from '@/integrations/supabase/client';
import { getSessionUser } from '@/lib/currentUser';
import { usePsychologistEmergency } from '@/hooks/usePsychologistEmergency';
import { usePsychologistSchedule } from '@/hooks/usePsychologistSchedule';
import { usePsychologistPresence } from '@/hooks/usePsychologistPresence';
import { usePsychologistVacation } from '@/hooks/usePsychologistVacation';
import { usePsychologistAvailability } from '@/hooks/usePsychologistAvailability';
import { useNotifications } from '@/hooks/useNotifications';
import EmergencyNotifications from '@/components/psychologist/EmergencyNotifications';
import UpcomingConsultations from '@/components/psychologist/UpcomingConsultations';
import ConsultationHistory from '@/components/psychologist/ConsultationHistory';
import OnlineStatusToggle from '@/components/psychologist/OnlineStatusToggle';
import { PixModal } from '@/components/psychologist/PixModal';
import { WeeklyScheduleModal } from '@/components/psychologist/WeeklyScheduleModal';
import { FirstTimeAvailabilityModal } from '@/components/psychologist/FirstTimeAvailabilityModal';
import logoImg from '@/assets/soliv-logo.svg';
import ActiveCallBanner from '@/components/sos/ActiveCallBanner';
import { getWeekStartISO } from '@/lib/psychologistAvailability';
import RouteSkeleton from "@/components/skeletons/RouteSkeleton";

const weeklyConfirmStorageKey = (userId: string) => `soliv:availability-week-confirmed:${userId}`;


const PsychologistDashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPixModal, setShowPixModal] = useState(false);
  const [showWeeklyScheduleModal, setShowWeeklyScheduleModal] = useState(false);
  const [showFirstTimeModal, setShowFirstTimeModal] = useState(false);
  const [psychologistData, setPsychologistData] = useState<any>(null);

  const { emergencyRequests } = usePsychologistEmergency();
  const { todayAppointments, upcomingAppointments } = usePsychologistSchedule();
  const { isOnline } = usePsychologistPresence();
  const { activeVacation, loading: loadingVacation } = usePsychologistVacation();
  const { blocks: baseBlocks, loading: loadingBase, refetch: refetchBase } = usePsychologistAvailability();
  const { unreadCount } = useNotifications();

  useEffect(() => {
    checkUserProfile();
  }, []);

  // Só depois que o cadastro básico (PIX) está completo: primeiro pede o
  // horário-padrão (uma vez, se ainda não configurado) e, com ele já
  // configurado, oferece a confirmação semanal — nunca durante férias, já
  // que nesse período a agenda fica marcada como indisponível.
  useEffect(() => {
    if (!profile || loadingVacation || loadingBase) return;
    if (!psychologistData?.pix_key || !psychologistData?.pix_type) return;
    if (activeVacation) return;
    if (baseBlocks.length === 0) {
      setShowFirstTimeModal(true);
      return;
    }
    try {
      const lastConfirmed = localStorage.getItem(weeklyConfirmStorageKey(profile.user_id));
      if (lastConfirmed !== getWeekStartISO(new Date())) {
        setShowWeeklyScheduleModal(true);
      }
    } catch {
      // localStorage indisponível (modo privado, etc.) — não bloqueia o app
    }
  }, [profile, psychologistData, activeVacation, loadingVacation, baseBlocks, loadingBase]);

  const checkUserProfile = async () => {
    try {
      const { data: { user } } = await getSessionUser();
      
      if (!user) {
        navigate('/');
        return;
      }

      // Verify user is psychologist and not admin
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error || !profile) {
        navigate('/');
        return;
      }

      // Check if user is super admin - if so, redirect to admin area
      if (user.user_metadata?.is_super_admin === true) {
        navigate('/admin-dashboard');
        return;
      }

      // Check if psychologist is approved
      if (profile.user_type === 'psychologist') {
        const { data: registrationData } = await supabase
          .from('psychologist_registrations')
          .select('status')
          .eq('user_id', user.id)
          .single();

        if (!registrationData || registrationData.status !== 'approved') {
          // Check user metadata for approval status
          if (user.user_metadata?.account_status !== 'approved') {
            navigate('/?error=not_approved');
            return;
          }
        }
      }

      // Only allow psychologists
      if (profile.user_type !== 'psychologist') {
        if (profile.user_type === 'patient') {
          navigate('/');
        } else {
          navigate('/');
        }
        return;
      }

      setProfile(profile);

      // Check PIX information
      // CPF/Pix não são lidos direto da tabela (outros usuários também leem
      // a linha do psicólogo); vêm por uma função que só devolve os do próprio.
      const { data: privateRows } = await supabase.rpc('get_my_psychologist_private');
      const psychData = privateRows?.[0] ?? null;

      setPsychologistData(psychData);

      // If PIX is not configured, show modal
      if (!psychData?.pix_key || !psychData?.pix_type) {
        setShowPixModal(true);
      }
    } catch (error) {
      console.error('Error checking profile:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  // Sair: sempre pelo signOut central (garante voltar para a tela de login).
  const { signOut } = useAuth();
  const handleLogout = () => signOut();

  if (loading) {
    return <RouteSkeleton />;
  }

  const pendingEmergencies = emergencyRequests.filter(req => req.status === 'pending').length;
  const todayConsultations = todayAppointments.length;
  const todayLabel = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const upcomingConsultations = upcomingAppointments.length;

  const tabTriggerClass =
    'flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 px-2 text-xs sm:text-sm font-medium rounded-md ' +
    'data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm transition-colors';

  return (
    <div className="min-h-screen bg-background">
      {/* Cabeçalho: marca, disponibilidade, avisos e o menu da conta. */}
      <header className="sticky top-0 z-30 bg-primary text-primary-foreground border-b border-primary/40 shadow-sm">
        <div className="max-w-7xl mx-auto flex h-14 items-center justify-between gap-3 px-3 sm:h-16 sm:px-4">
          <Wordmark className="h-[26px] sm:h-[30px] text-white shrink-0" />

          <div className="flex items-center gap-1.5 sm:gap-2">
            <OnlineStatusToggle />
            <Button
              variant="ghost"
              size="icon"
              className="relative h-10 w-10 rounded-full text-white hover:bg-white/15 hover:text-white"
              onMouseEnter={() => import('./Notifications')}
              onClick={() => navigate('/psychologist-notifications')}
              aria-label={unreadCount > 0 ? `Notificações, ${unreadCount} não lidas` : 'Notificações'}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center px-1 text-xs leading-none"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
            </Button>
            <PsychologistAccountMenu
              name={profile?.full_name}
              onWeeklySchedule={() => setShowWeeklyScheduleModal(true)}
              onSignOut={handleLogout}
            />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 md:py-6 space-y-4 sm:space-y-5 md:space-y-6">
        {/* Saudação: saiu do cabeçalho para não apertar os botões no celular. */}
        <div>
          <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
            Olá, Dr.(a) {profile?.full_name?.split(' ')[0]}
          </h1>
          <p className="text-sm text-muted-foreground first-letter:uppercase">{todayLabel}</p>
        </div>

        <ActiveCallBanner />

        {/* Resumo do dia */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4">
          {[
            { label: 'Emergências', hint: 'pendentes', value: pendingEmergencies, icon: AlertTriangle, tone: 'text-destructive', box: 'bg-destructive/10' },
            { label: 'Hoje', hint: 'consultas', value: todayConsultations, icon: Calendar, tone: 'text-primary', box: 'bg-primary/10' },
            { label: 'Próximas', hint: 'agendadas', value: upcomingConsultations, icon: Clock, tone: 'text-foreground', box: 'bg-muted' },
          ].map(({ label, hint, value, icon: Icon, tone, box }) => (
            <Card key={label} className="border-border/60">
              <CardContent className="flex items-start justify-between gap-2 p-3 sm:p-5">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground sm:text-sm">{label}</p>
                  <p className={`mt-1 text-2xl font-bold sm:text-3xl ${tone}`}>{value}</p>
                  <p className="mt-0.5 hidden text-xs text-muted-foreground sm:block">{hint}</p>
                </div>
                <div className={`hidden shrink-0 rounded-xl p-2.5 sm:block ${box}`} aria-hidden="true">
                  <Icon className={`h-5 w-5 ${tone}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content */}
        <Tabs defaultValue="emergency" className="space-y-4">
          <TabsList className="w-full h-auto p-1 bg-muted/60 grid grid-cols-3 gap-1 rounded-lg">
            <TabsTrigger value="emergency" className={tabTriggerClass}>
              <Bell className="w-4 h-4 shrink-0" />
              <span>Emergências</span>
              {pendingEmergencies > 0 && (
                <Badge variant="destructive" className="ml-0.5 h-4 sm:h-5 px-1 sm:px-1.5 text-xs">
                  {pendingEmergencies}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="consultations" className={tabTriggerClass}>
              <Users className="w-4 h-4 shrink-0" />
              <span>Consultas</span>
            </TabsTrigger>
            <TabsTrigger value="history" className={tabTriggerClass}>
              <History className="w-4 h-4 shrink-0" />
              <span>Histórico</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="emergency" className="mt-4">
            <EmergencyNotifications />
          </TabsContent>

          <TabsContent value="consultations" className="mt-4">
            <UpcomingConsultations />
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <ConsultationHistory />
          </TabsContent>
        </Tabs>
      </div>

      {/* PIX Modal */}
      {profile && (
        <PixModal
          isOpen={showPixModal}
          onClose={() => {
            setShowPixModal(false);
            // Refresh psychologist data
            checkUserProfile();
          }}
          userId={profile.user_id}
        />
      )}

      {/* Configuração inicial do horário-padrão (só uma vez) */}
      {profile && (
        <FirstTimeAvailabilityModal
          open={showFirstTimeModal}
          onClose={() => setShowFirstTimeModal(false)}
          onSaved={() => {
            setShowFirstTimeModal(false);
            try {
              // Já conta como a semana confirmada — evita mostrar a modal
              // semanal logo em seguida da configuração inicial.
              localStorage.setItem(weeklyConfirmStorageKey(profile.user_id), getWeekStartISO(new Date()));
            } catch {
              // localStorage indisponível — segue sem lembrar pra próxima
            }
            void refetchBase();
          }}
        />
      )}

      {/* Confirmação semanal da agenda */}
      {profile && (
        <WeeklyScheduleModal
          open={showWeeklyScheduleModal}
          onClose={() => setShowWeeklyScheduleModal(false)}
          onConfirmed={(weekStartISO) => {
            try {
              localStorage.setItem(weeklyConfirmStorageKey(profile.user_id), weekStartISO);
            } catch {
              // localStorage indisponível — fecha mesmo assim, só não lembra pra próxima
            }
            setShowWeeklyScheduleModal(false);
          }}
        />
      )}
    </div>
  );
};

export default PsychologistDashboard;