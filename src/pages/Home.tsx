import { 
  Calendar, 
  MessageCircle, 
  Users2, 
  Activity, 
  Headphones, 
  BarChart3, 
  BookOpen,
  Bell,
  User,
  AlertTriangle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { NotificationButton } from "@/components/notifications/NotificationButton";
import { Button } from "@/components/ui/button";
import { MoodSelector } from "@/components/MoodSelector";
import { DesktopSidebar } from "@/components/DesktopSidebar";
import BottomNavigation from "@/components/BottomNavigation";
import Logo from "@/components/Logo";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";

const HomePage = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    fetchUserProfile();
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

  const firstName = userProfile?.user_metadata?.full_name?.split(' ')[0] || 'Usuário';

  const features = [
    {
      icon: <Calendar className="w-8 h-8 lg:w-10 lg:h-10 text-primary transition-all duration-300 group-hover:scale-110" />,
      title: "Consultas",
      subtitle: "Agende suas consultas",
      onClick: () => navigate('/appointments')
    },
    {
      icon: <Activity className="w-8 h-8 lg:w-10 lg:h-10 text-primary transition-all duration-300 group-hover:scale-110" />,
      title: "Respiração Guiada", 
      subtitle: "Exercícios de relaxamento",
      onClick: () => navigate('/breathing')
    },
    {
      icon: <Headphones className="w-8 h-8 lg:w-10 lg:h-10 text-primary transition-all duration-300 group-hover:scale-110" />,
      title: "Sons Terapêuticos",
      subtitle: "Biblioteca de áudios calmantes",
      onClick: () => navigate('/sounds')
    },
    {
      icon: <Users2 className="w-8 h-8 lg:w-10 lg:h-10 text-primary transition-all duration-300 group-hover:scale-110" />,
      title: "Grupos de Apoio",
      subtitle: "Suporte da comunidade",
      onClick: () => navigate('/support-groups')
    },
    {
      icon: <BookOpen className="w-8 h-8 lg:w-10 lg:h-10 text-primary transition-all duration-300 group-hover:scale-110" />,
      title: "Meu Diário",
      subtitle: "Diário pessoal",
      onClick: () => navigate('/journal')
    },
    {
      icon: <BarChart3 className="w-8 h-8 lg:w-10 lg:h-10 text-primary transition-all duration-300 group-hover:scale-110" />,
      title: "Meu Progresso", 
      subtitle: "Acompanhe sua jornada",
      onClick: () => navigate('/statistics')
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <DesktopSidebar />
      
      <div className="lg:pl-64">
        {/* Mobile/Tablet Header */}
        <header className="lg:hidden bg-card border-b border-border p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <Logo />
            <div className="flex items-center gap-3">
              <NotificationButton />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => navigate('/profile')}
              >
                <User className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Desktop Header */}
        <header className="hidden lg:block bg-card border-b border-border p-6">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Olá, {firstName}!
              </h1>
              <p className="text-muted-foreground">Como você está se sentindo hoje?</p>
            </div>
            <div className="flex items-center gap-4">
              <MoodSelector />
              <div className="flex items-center gap-2">
                <NotificationButton />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => navigate('/profile')}
                >
                  <User className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-4 lg:p-6 pb-20 lg:pb-6">
          <div className="max-w-6xl mx-auto">
            {/* Mobile/Tablet Greeting */}
            <div className="lg:hidden mb-6">
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Olá, {firstName}!
              </h1>
              <p className="text-muted-foreground mb-4">Como você está se sentindo hoje?</p>
              <MoodSelector />
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
              {features.map((feature, index) => (
                <Card 
                  key={index}
                  className="group cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-border/60 hover:border-primary/30"
                  onClick={feature.onClick}
                >
                  <CardContent className="p-4 lg:p-6 text-center">
                    <div className="flex justify-center mb-3 lg:mb-4 p-3 lg:p-4 rounded-xl bg-primary/5 group-hover:bg-primary/10 transition-colors duration-300 mx-auto w-fit">
                      {feature.icon}
                    </div>
                    <h3 className="font-semibold text-foreground text-sm lg:text-base leading-tight mb-1">
                      {feature.title}
                    </h3>
                    {!isMobile && (
                      <p className="text-xs lg:text-sm text-muted-foreground group-hover:text-foreground/80 transition-colors duration-300">
                        {feature.subtitle}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Quick Actions Section */}
            <div className="mt-8 lg:mt-12">
              <h2 className="text-lg lg:text-xl font-semibold text-foreground mb-4 lg:mb-6">
                Acesso Rápido
              </h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card 
                  className="group cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 border-border/60 lg:col-span-2"
                  onClick={() => navigate('/sos')}
                >
                  <CardContent className="p-4 lg:p-6 text-center">
                    <div className="w-10 h-10 lg:w-12 lg:h-12 bg-destructive rounded-full flex items-center justify-center mx-auto mb-3">
                      <AlertTriangle className="w-5 h-5 lg:w-6 lg:h-6 text-destructive-foreground" />
                    </div>
                    <p className="text-sm lg:text-base font-semibold text-foreground">
                      Ajuda Emergencial
                    </p>
                    <p className="text-xs lg:text-sm text-muted-foreground mt-1">
                      Suporte imediato 24/7
                    </p>
                  </CardContent>
                </Card>
                
                <Card 
                  className="group cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 border-border/60 lg:col-span-2"
                  onClick={() => navigate('/chat')}
                >
                  <CardContent className="p-4 lg:p-6 text-center">
                    <div className="w-10 h-10 lg:w-12 lg:h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <MessageCircle className="w-5 h-5 lg:w-6 lg:h-6 text-primary group-hover:scale-110 transition-transform duration-300" />
                    </div>
                    <p className="text-sm lg:text-base font-semibold text-foreground">
                      Chat
                    </p>
                    <p className="text-xs lg:text-sm text-muted-foreground mt-1">
                      Converse com profissionais
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Bottom Navigation - Only on Mobile/Tablet */}
      <div className="lg:hidden">
        <BottomNavigation />
      </div>
    </div>
  );
};

export default HomePage;