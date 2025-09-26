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
  AlertTriangle,
  Sun,
  Check
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
import React from "react";

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
        <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card shadow-sm border-b border-border">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            {/* Logo Soliv à esquerda */}
            <div className="flex items-center space-x-2">
              <Sun className="w-6 h-6 text-primary" />
              <span className="text-xl font-bold text-foreground">Soliv</span>
            </div>
            
            {/* CORREÇÃO: Notificações e Avatar à direita, melhor posicionados */}
            <div className="flex items-center space-x-3">
              {/* Botão Notificações - posição correta */}
              <button 
                className="relative p-2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => navigate('/notifications')}
              >
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full"></span>
              </button>
              
              {/* Avatar do usuário */}
              <div 
                className="w-8 h-8 rounded-full bg-primary flex items-center justify-center cursor-pointer" 
                onClick={() => navigate('/profile')}
              >
                <span className="text-primary-foreground text-sm font-medium">
                  {firstName.charAt(0).toUpperCase()}
                </span>
              </div>
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
        <main className="pt-16 lg:pt-0 pb-20 lg:pb-6 px-4 lg:p-6">
          <div className="max-w-6xl mx-auto">
            {/* Mobile/Tablet Greeting Section */}
            <section className="lg:hidden mb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Olá, <span className="text-primary">{firstName}</span>! 👋</h1>
                  <p className="text-muted-foreground">Como você está se sentindo hoje?</p>
                </div>
                <div className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full">
                  {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>
              </div>

              {/* Componente Interativo de Humor */}
              <div className="flex space-x-3 overflow-x-auto pb-4 -mx-1 px-1">
                {[
                  { emoji: '😢', label: 'Triste' },
                  { emoji: '😟', label: 'Preocupado' },
                  { emoji: '😐', label: 'Neutro' },
                  { emoji: '🙂', label: 'Bem' },
                  { emoji: '😊', label: 'Feliz' },
                  { emoji: '😄', label: 'Ótimo' },
                  { emoji: '🤩', label: 'Empolgado' }
                ].map((mood, index) => (
                  <button key={index} className="flex-shrink-0 flex flex-col items-center space-y-2 p-3 rounded-xl bg-card border border-border hover:border-primary transition-all duration-200 active:scale-95">
                    <span className="text-2xl">{mood.emoji}</span>
                    <span className="text-sm font-medium text-foreground">{mood.label}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Seção de Atividades de Hoje */}
            <section className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">Sua rotina hoje</h2>
                <span className="text-xs text-muted-foreground">2 de 5 completas</span>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-card rounded-xl border border-border">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                      <BookOpen className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-foreground">Escrever no diário</span>
                  </div>
                  <div className="w-6 h-6 border-2 border-primary rounded-full"></div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-card rounded-xl border border-border">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <Activity className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="text-foreground">Respiração guiada</span>
                  </div>
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                </div>
              </div>
            </section>

            {/* Resources Section - Improved Grid */}
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-foreground mb-4">Seus recursos</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {features.map((feature, index) => (
                  <div key={index} className="bg-card rounded-xl p-4 border border-border hover:border-primary transition-colors group cursor-pointer" onClick={feature.onClick}>
                    <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                      {React.cloneElement(feature.icon, { className: "w-6 h-6 text-white" })}
                    </div>
                    <h3 className="font-semibold text-foreground mb-1 text-sm lg:text-base">{feature.title}</h3>
                    {!isMobile && (
                      <p className="text-xs text-muted-foreground">{feature.subtitle}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>

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