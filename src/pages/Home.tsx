import { Waves, Brain, TrendingUp, Crown, Phone, Bell, User, Calendar, Settings, Users, Lock, MessageCircle, Video } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import FeatureCard from "@/components/FeatureCard";
import SOSButton from "@/components/SOSButton";
import { NotificationButton } from "@/components/notifications/NotificationButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import BottomNavigation from "@/components/BottomNavigation";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAppointmentVideoCall } from "@/hooks/useAppointmentVideoCall";
import { formatTimeOnly, formatBrazilTime } from "@/utils/timezone";

const HomePage = () => {
  const navigate = useNavigate();
  const { subscribed, subscriptionTier } = useSubscription();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [upcomingAppointments, setUpcomingAppointments] = useState(0);
  const [todayAppointment, setTodayAppointment] = useState<any>(null);
  const [nextAppointment, setNextAppointment] = useState<any>(null);
  const { canJoinCall, startConsultation } = useAppointmentVideoCall();

  useEffect(() => {
    fetchUserProfile();
    fetchUpcomingAppointments();
    fetchTodayAppointment();
    fetchNextAppointment();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserProfile(user);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchUpcomingAppointments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { count } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('patient_id', user.id)
          .in('status', ['scheduled', 'confirmed', 'in_progress'])
          .gte('scheduled_at', new Date().toISOString());
        
        setUpcomingAppointments(count || 0);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
    }
  };

  const fetchTodayAppointment = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

        const { data, error } = await supabase
          .from('appointments')
          .select(`
            id,
            scheduled_at,
            status,
            appointment_type,
            psychologists!psychologist_id(
              full_name,
              specialization
            )
          `)
          .eq('patient_id', user.id)
          .in('status', ['scheduled', 'confirmed', 'in_progress'])
          .gte('scheduled_at', startOfDay.toISOString())
          .lt('scheduled_at', endOfDay.toISOString())
          .order('scheduled_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        
        if (data) {
          const transformedAppointment = {
            id: data.id,
            scheduled_at: data.scheduled_at,
            status: data.status,
            appointment_type: data.appointment_type,
            psychologist: {
              full_name: data.psychologists?.full_name || 'Psicólogo não identificado',
              specialization: data.psychologists?.specialization,
            }
          };
          setTodayAppointment(transformedAppointment);
        }
      }
    } catch (error) {
      console.error('Error fetching today appointment:', error);
    }
  };

  const fetchNextAppointment = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        const { data, error } = await supabase
          .from('appointments')
          .select(`
            id,
            scheduled_at,
            status,
            appointment_type,
            psychologists!psychologist_id(
              full_name,
              specialization
            )
          `)
          .eq('patient_id', user.id)
          .in('status', ['scheduled', 'confirmed', 'in_progress'])
          .gte('scheduled_at', tomorrow.toISOString())
          .order('scheduled_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        
        if (data) {
          const transformedAppointment = {
            id: data.id,
            scheduled_at: data.scheduled_at,
            status: data.status,
            appointment_type: data.appointment_type,
            psychologist: {
              full_name: data.psychologists?.full_name || 'Psicólogo não identificado',
              specialization: data.psychologists?.specialization,
            }
          };
          setNextAppointment(transformedAppointment);
        }
      }
    } catch (error) {
      console.error('Error fetching next appointment:', error);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  const firstName = userProfile?.user_metadata?.full_name?.split(' ')[0] || userProfile?.email?.split('@')[0] || 'Usuário';

  return (
    <div className="min-h-screen bg-gradient-calm">
      {/* Modern Header */}
      <div className="bg-card/80 backdrop-blur-sm border-b border-border/50 sticky top-0 z-40">
        <div className="flex items-center justify-between p-4">
          {/* Greeting */}
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">
              {getGreeting()}, {firstName}!
            </h1>
            <p className="text-sm text-muted-foreground">
              Como você está se sentindo hoje?
            </p>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-2">
            <NotificationButton />
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/profile')}
              className="rounded-full"
            >
              <User className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Today's Appointment Card - Only if user has appointment today */}
      {todayAppointment && (
        <div className="p-4">
          <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/30 animate-fade-in">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Consulta de hoje</p>
                  <p className="font-semibold text-foreground">
                    {formatTimeOnly(todayAppointment.scheduled_at)} - {todayAppointment.psychologist.full_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {todayAppointment.psychologist.specialization}
                  </p>
                </div>
                <Button
                  variant={canJoinCall(todayAppointment) ? "default" : "outline"}
                  size="sm"
                  disabled={!canJoinCall(todayAppointment)}
                  onClick={async () => {
                    if (canJoinCall(todayAppointment)) {
                      try {
                        await startConsultation(todayAppointment.id);
                        navigate(`/consultation-call/${todayAppointment.id}`);
                      } catch (error) {
                        console.error('Failed to start consultation:', error);
                      }
                    }
                  }}
                  className="gap-2"
                >
                  <Video className="h-4 w-4" />
                  {canJoinCall(todayAppointment) ? 'Entrar' : 'Aguardar'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Next Appointment Card - Show next appointment info when no appointment today */}
      {!todayAppointment && nextAppointment && (
        <div className="p-4">
          <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20 animate-fade-in">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Próxima consulta</p>
                  <p className="font-semibold text-foreground">
                    {formatBrazilTime(nextAppointment.scheduled_at, "dd 'de' MMM")} às {formatTimeOnly(nextAppointment.scheduled_at)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {nextAppointment.psychologist.full_name} - {nextAppointment.psychologist.specialization}
                  </p>
                </div>
                <Button
                  variant="primary-soft"
                  size="sm"
                  onClick={() => navigate('/appointments')}
                  className="gap-2"
                >
                  <Calendar className="h-4 w-4" />
                  Ver detalhes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Fallback when no appointments */}
      {upcomingAppointments > 0 && !todayAppointment && !nextAppointment && (
        <div className="p-4">
          <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20 animate-fade-in">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Próxima consulta</p>
                  <p className="font-semibold text-foreground">
                    {upcomingAppointments} agendada{upcomingAppointments > 1 ? 's' : ''}
                  </p>
                </div>
                <Button
                  variant="primary-soft"
                  size="sm"
                  onClick={() => navigate('/appointments')}
                  className="gap-2"
                >
                  <Calendar className="h-4 w-4" />
                  Ver detalhes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Features */}
      <div className="p-4 space-y-6 pb-24">
        {/* Apoio Profissional */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            Apoio Profissional
          </h2>
          
          <div className="grid grid-cols-1 gap-4">
            <FeatureCard
              icon={<Calendar className="w-8 h-8" />}
              title="Consultas"
              description="Agende e gerencie suas consultas"
              variant="default"
              onClick={() => navigate('/appointments')}
              className="animate-fade-in [animation-delay:100ms]"
            />

             <FeatureCard
              icon={<MessageCircle className="w-8 h-8" />}
              title="Chat com Psicólogos"
              description="Converse por texto com profissionais capacitados"
              variant="default"
              onClick={() => navigate('/chat')}
              className="animate-fade-in"
            />
          </div>
        </div>

        {/* Autocuidado */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            Autocuidado
          </h2>
          
          <div className="grid grid-cols-1 gap-4">
            <FeatureCard
              icon={<Users className="w-8 h-8" />}
              title="Grupos de Apoio"
              description="Participe de grupos com pessoas que compartilham experiências similares"
              variant="default"
              onClick={() => navigate('/support-groups')}
              className="animate-fade-in [animation-delay:200ms]"
            />
            
            <FeatureCard
              icon={<Waves className="w-8 h-8" />}
              title="Respiração Guiada"
              description="Exercícios de respiração para acalmar a mente e reduzir a ansiedade"
              variant="breathing"
              onClick={() => navigate('/breathing')}
              className="animate-fade-in"
            />
            
            <FeatureCard
              icon={<Brain className="w-8 h-8" />}
              title="Sons Relaxantes"
              description="Biblioteca de sons da natureza e músicas calmantes"
              variant="sounds"
              onClick={() => navigate('/sounds')}
              className="animate-fade-in [animation-delay:100ms]"
            />
          </div>
        </div>

        {/* Minha Jornada */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            Minha Jornada
          </h2>
          
          <div className="grid grid-cols-1 gap-4">
            <FeatureCard
              icon={<TrendingUp className="w-8 h-8" />}
              title="Minha Evolução"
              description="Acompanhe seu progresso e métricas de bem-estar"
              variant="evolution"
              onClick={() => navigate('/statistics')}
              className="animate-fade-in"
            />

            <FeatureCard
              icon={<Lock className="w-8 h-8" />}
              title="Meu Diário"
              description="Escreva seus pensamentos em um ambiente seguro e privado"
              variant="default"
              onClick={() => navigate('/journal')}
              className="animate-fade-in [animation-delay:100ms]"
            />
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation />

      {/* Floating SOS Button */}
      <div className="fixed bottom-20 right-4 z-50 animate-float">
        <SOSButton />
      </div>
    </div>
  );
};

export default HomePage;