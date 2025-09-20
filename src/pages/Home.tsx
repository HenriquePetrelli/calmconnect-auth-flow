import { Waves, Brain, TrendingUp, Crown, Phone, Bell, User, Calendar, Settings, Home as HomeIcon, Users, Lock, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import FeatureCard from "@/components/FeatureCard";
import SOSButton from "@/components/SOSButton";
import { NotificationButton } from "@/components/notifications/NotificationButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const HomePage = () => {
  const navigate = useNavigate();
  const { subscribed, subscriptionTier } = useSubscription();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [upcomingAppointments, setUpcomingAppointments] = useState(0);

  useEffect(() => {
    fetchUserProfile();
    fetchUpcomingAppointments();
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
          .eq('status', 'confirmed')
          .gte('date_time', new Date().toISOString());
        
        setUpcomingAppointments(count || 0);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
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
              {getGreeting()}, {firstName}! 👋
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

      {/* Quick Stats Card - Only if user has appointments */}
      {upcomingAppointments > 0 && (
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
      <div className="p-4 space-y-4 pb-24">
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            Ferramentas de Bem-estar
          </h2>
          
          {/* Primary Features Grid */}
          <div className="grid grid-cols-1 gap-4">
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

          {/* Secondary Features Grid */}
          <div className="grid grid-cols-1 gap-4 mt-4">
            <FeatureCard
              icon={<TrendingUp className="w-8 h-8" />}
              title="Minha Evolução"
              description="Acompanhe seu progresso e métricas de bem-estar"
              variant="evolution"
              onClick={() => navigate('/statistics')}
              badge={
                <Badge className="bg-evolution-primary text-white text-xs px-2 py-1">
                  3
                </Badge>
              }
              className="animate-fade-in [animation-delay:200ms]"
            />
            
            <FeatureCard
              icon={
                <div className="relative">
                  <Users className="text-gray-400 w-8 h-8" />
                  <Lock className="absolute -bottom-1 -right-1 w-4 h-4 text-gray-500" />
                </div>
              }
              title="Aulas de Yoga"
              description="Sessões guiadas de yoga e mindfulness - Em breve disponível"
              disabled={true}
              badge={
                <Badge variant="secondary" className="text-xs px-2 py-1">
                  EM BREVE
                </Badge>
              }
              className="animate-fade-in [animation-delay:300ms]"
            />
          </div>
        </div>

        {/* Professional Care Section */}
        <div className="space-y-3 mt-8">
          <h2 className="text-lg font-semibold text-foreground">
            Cuidado Profissional
          </h2>
          
          <FeatureCard
            icon={<Calendar className="w-8 h-8" />}
            title="Consultas"
            description={
              subscribed 
                ? "Agende sua consulta com um psicólogo especializado"
                : "Faça upgrade para agendar consultas"
            }
            variant="default"
            onClick={() => navigate('/appointments')}
            badge={
              !subscribed ? (
                <Badge variant="secondary" className="bg-primary text-primary-foreground">
                  <Crown className="w-3 h-3 mr-1" />
                  Premium
                </Badge>
              ) : undefined
            }
            className="animate-fade-in [animation-delay:400ms]"
          />

          <FeatureCard
            icon={<MessageCircle className="w-8 h-8" />}
            title="Chat com Psicólogos"
            description={
              subscribed 
                ? "Converse em tempo real com psicólogos que você já consultou"
                : "Faça upgrade para acessar o chat com psicólogos"
            }
            variant="default"
            onClick={() => navigate('/chat')}
            badge={
              !subscribed ? (
                <Badge variant="secondary" className="bg-primary text-primary-foreground">
                  <Crown className="w-3 h-3 mr-1" />
                  Premium
                </Badge>
              ) : undefined
            }
            className="animate-fade-in [animation-delay:450ms]"
          />
        </div>

        {/* Subscription Upsell for Free Users */}
        {!subscribed && (
          <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20 animate-fade-in [animation-delay:500ms]">
            <CardContent className="p-6 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <Crown className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-foreground mb-2">
                  Desbloqueie Seu Potencial
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Acesse consultas com psicólogos, suporte emergencial 24h e muito mais
                </p>
                <Button
                  variant="default"
                  size="lg"
                  onClick={() => navigate('/subscription-plans')}
                  className="gap-2"
                >
                  <Crown className="w-4 h-4" />
                  Ver Planos
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border/50 p-4">
        <div className="flex items-center justify-around max-w-md mx-auto">
          <Button
            variant="ghost"
            size="sm"
            className="flex-col h-auto py-2 px-3 rounded-xl bg-primary/10 text-primary"
          >
            <div className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center mb-1">
              <HomeIcon className="w-4 h-4" />
            </div>
            <span className="text-xs font-medium">Home</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/appointments')}
            className="flex-col h-auto py-2 px-3 rounded-xl text-muted-foreground hover:text-foreground"
          >
            <Calendar className="w-6 h-6 mb-1" />
            <span className="text-xs">Consultas</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/profile')}
            className="flex-col h-auto py-2 px-3 rounded-xl text-muted-foreground hover:text-foreground"
          >
            <User className="w-6 h-6 mb-1" />
            <span className="text-xs">Perfil</span>
          </Button>
        </div>
      </div>

      {/* Floating SOS Button */}
      <div className="fixed bottom-20 right-4 z-50 animate-float">
        <SOSButton />
      </div>
    </div>
  );
};

export default HomePage;