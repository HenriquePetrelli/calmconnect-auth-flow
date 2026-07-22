import { useState, useEffect } from 'react';
import { SkeletonFullPage } from '@/components/skeletons/Skeletons';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, Calendar, User, History, AlertTriangle, Clock, Users, CheckCircle, LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usePsychologistEmergency } from '@/hooks/usePsychologistEmergency';
import { usePsychologistSchedule } from '@/hooks/usePsychologistSchedule';
import { usePsychologistPresence } from '@/hooks/usePsychologistPresence';
import EmergencyNotifications from '@/components/psychologist/EmergencyNotifications';
import UpcomingConsultations from '@/components/psychologist/UpcomingConsultations';
import ConsultationHistory from '@/components/psychologist/ConsultationHistory';
import OnlineStatusToggle from '@/components/psychologist/OnlineStatusToggle';
import { PixModal } from '@/components/psychologist/PixModal';

const PsychologistDashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPixModal, setShowPixModal] = useState(false);
  const [psychologistData, setPsychologistData] = useState<any>(null);
  
  const { emergencyRequests } = usePsychologistEmergency();
  const { todayAppointments, upcomingAppointments } = usePsychologistSchedule();
  const { isOnline } = usePsychologistPresence();

  useEffect(() => {
    checkUserProfile();
  }, []);

  const checkUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
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
      const { data: psychData } = await supabase
        .from('psychologists')
        .select('pix_key, pix_type')
        .eq('user_id', user.id)
        .single();

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading) {
    return <SkeletonFullPage />;
  }

  const pendingEmergencies = emergencyRequests.filter(req => req.status === 'pending').length;
  const todayConsultations = todayAppointments.length;
  const upcomingConsultations = upcomingAppointments.length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-secondary text-secondary-foreground border-b border-secondary/40 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 px-4 py-3 md:py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wider text-secondary-foreground/70">
              Área do Psicólogo
            </p>
            <h1 className="text-lg md:text-xl font-semibold text-white truncate">
              Olá, Dr.(a) {profile?.full_name?.split(' ')[0]}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <OnlineStatusToggle />
            <div className="hidden sm:block w-px h-6 bg-white/20" aria-hidden />
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full text-white hover:bg-white/15 hover:text-white"
              onMouseEnter={() => import('./PsychologistProfile')}
              onClick={() => navigate('/psychologist-profile')}
              title="Perfil"
              aria-label="Perfil"
            >
              <User className="w-[18px] h-[18px]" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full text-white hover:bg-destructive/40 hover:text-white"
              onClick={handleLogout}
              title="Sair"
              aria-label="Sair"
            >
              <LogOut className="w-[18px] h-[18px]" />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-5 md:space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          <Card className="border-destructive/20 bg-gradient-to-br from-destructive/5 to-transparent transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Emergências</p>
                  <p className="text-3xl font-bold text-destructive mt-1.5">{pendingEmergencies}</p>
                  <p className="text-xs text-muted-foreground mt-1">pendentes</p>
                </div>
                <div className="rounded-lg bg-destructive/10 p-2.5 shrink-0">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Hoje</p>
                  <p className="text-3xl font-bold text-primary mt-1.5">{todayConsultations}</p>
                  <p className="text-xs text-muted-foreground mt-1">consultas</p>
                </div>
                <div className="rounded-lg bg-primary/10 p-2.5 shrink-0">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-secondary/30 bg-gradient-to-br from-secondary/10 to-transparent transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Próximas</p>
                  <p className="text-3xl font-bold text-secondary-foreground mt-1.5">{upcomingConsultations}</p>
                  <p className="text-xs text-muted-foreground mt-1">agendadas</p>
                </div>
                <div className="rounded-lg bg-secondary/20 p-2.5 shrink-0">
                  <Clock className="w-5 h-5 text-secondary-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="emergency" className="space-y-4">
          <TabsList className="w-full h-auto p-1 bg-muted/50 grid grid-cols-3 gap-1">
            <TabsTrigger value="emergency" className="flex items-center gap-2 py-2.5 data-[state=active]:bg-secondary data-[state=active]:text-white data-[state=active]:shadow-sm">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Emergências</span>
              {pendingEmergencies > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                  {pendingEmergencies}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="consultations" className="flex items-center gap-2 py-2.5 data-[state=active]:bg-secondary data-[state=active]:text-white data-[state=active]:shadow-sm">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Consultas</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2 py-2.5 data-[state=active]:bg-secondary data-[state=active]:text-white data-[state=active]:shadow-sm">
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">Histórico</span>
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
    </div>
  );
};

export default PsychologistDashboard;