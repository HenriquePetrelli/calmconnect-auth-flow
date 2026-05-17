import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, Calendar, User, History, AlertTriangle, Clock, Users, CheckCircle } from 'lucide-react';
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
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  const pendingEmergencies = emergencyRequests.filter(req => req.status === 'pending').length;
  const todayConsultations = todayAppointments.length;
  const upcomingConsultations = upcomingAppointments.length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              Área do Psicólogo
            </h1>
            <p className="text-sm text-muted-foreground">
              Dr.(a) {profile?.full_name}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <OnlineStatusToggle />
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/psychologist-profile')}
            >
              <User className="w-4 h-4 mr-2" />
              Perfil
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
            >
              Sair
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Emergências</p>
                  <p className="text-2xl font-bold text-destructive">{pendingEmergencies}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Hoje</p>
                  <p className="text-2xl font-bold text-primary">{todayConsultations}</p>
                </div>
                <Calendar className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Próximas</p>
                  <p className="text-2xl font-bold text-secondary">{upcomingConsultations}</p>
                </div>
                <Clock className="w-8 h-8 text-secondary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="text-sm font-medium text-success">Online</p>
                </div>
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="emergency" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="emergency" className="flex items-center gap-2 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
              <Bell className="w-4 h-4" />
              Emergências
              {pendingEmergencies > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {pendingEmergencies}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="consultations" className="flex items-center gap-2 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
              <Users className="w-4 h-4" />
              Consultas
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
              <History className="w-4 h-4" />
              Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="emergency">
            <EmergencyNotifications />
          </TabsContent>

          <TabsContent value="consultations">
            <UpcomingConsultations />
          </TabsContent>

          <TabsContent value="history">
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