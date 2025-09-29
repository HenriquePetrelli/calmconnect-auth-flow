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
import { MoodSelectionModal } from "@/components/MoodSelectionModal";
import ConfirmationModal from "@/components/sos/ConfirmationModal";
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
  const [currentMood, setCurrentMood] = useState<string | null>(null);
  const [showMoodModal, setShowMoodModal] = useState(false);
  const [showSOSModal, setShowSOSModal] = useState(false);
  const [moodEnabled, setMoodEnabled] = useState(true);
  const [todayMoodValue, setTodayMoodValue] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadHomeData = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchUserProfile(),
        checkTodayMood()
      ]);
      setIsLoading(false);
    };
    
    loadHomeData();

    // Listen for mood toggle changes
    const handleMoodToggleChange = (event: CustomEvent) => {
      setMoodEnabled(event.detail.enabled);
    };

    window.addEventListener('moodToggleChanged', handleMoodToggleChange as EventListener);
    return () => {
      window.removeEventListener('moodToggleChanged', handleMoodToggleChange as EventListener);
    };
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

  const checkTodayMood = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];
      const { data: patientData } = await supabase
        .from('patients')
        .select('last_mood_date, last_mood_value, daily_mood_enabled')
        .eq('user_id', user.id)
        .single();

      // Check if mood tracking is enabled
      setMoodEnabled(patientData?.daily_mood_enabled !== false);

      // Reset mood daily at 00:01 Brazil time
      if (!patientData?.last_mood_date || patientData.last_mood_date !== today) {
        setCurrentMood(null);
        setTodayMoodValue(null);
      } else {
        // Show today's mood if it exists
        setTodayMoodValue(patientData.last_mood_value);
        const moods = [
          { emoji: '😀', label: 'Feliz', value: 5 },
          { emoji: '🙂', label: 'Calmo', value: 4 },
          { emoji: '😐', label: 'Neutro', value: 3 },
          { emoji: '😔', label: 'Triste', value: 2 },
          { emoji: '😡', label: 'Irritado', value: 1 }
        ];
        const todayMood = moods.find(mood => mood.value === patientData.last_mood_value);
        if (todayMood) {
          setCurrentMood(todayMood.emoji);
        }
      }
    } catch (error) {
      console.error('Error checking today mood:', error);
    }
  };

  const handleMoodSelected = (mood: string, value: number) => {
    setCurrentMood(mood);
    setTodayMoodValue(value);
  };

  const handleSOSConfirm = () => {
    setShowSOSModal(false);
    navigate('/sos'); // This should go to the waiting room
  };

  const firstName = userProfile?.user_metadata?.full_name?.split(' ')[0] || 'Usuário';

  const features = [
    {
      icon: Calendar,
      title: "Consultas",
      subtitle: "Agende suas consultas",
      onClick: () => navigate('/appointments'),
      color: 'hsl(230,100%,66%)'
    },
    {
      icon: Activity,
      title: "Respiração Guiada", 
      subtitle: "Exercícios de relaxamento",
      onClick: () => navigate('/breathing'),
      color: 'hsl(142,76%,66%)'
    },
    {
      icon: Headphones,
      title: "Sons Terapêuticos",
      subtitle: "Biblioteca de áudios calmantes",
      onClick: () => navigate('/sounds'),
      color: 'hsl(271,91%,65%)'
    },
    {
      icon: Users2,
      title: "Grupos de Apoio",
      subtitle: "Suporte da comunidade",
      onClick: () => navigate('/support-groups'),
      color: 'hsl(45,93%,51%)'
    },
    {
      icon: BookOpen,
      title: "Meu Diário",
      subtitle: "Diário pessoal",
      onClick: () => navigate('/journal'),
      color: 'hsl(48,96%,53%)'
    },
    {
      icon: BarChart3,
      title: "Meu Progresso", 
      subtitle: "Acompanhe sua jornada",
      onClick: () => navigate('/statistics'),
      color: 'hsl(187,85%,53%)'
    }
  ];

  return (
    <div className="min-h-screen bg-background" style={{
      backgroundImage: `url(${
        typeof window !== 'undefined' 
          ? window.innerWidth <= 767 
            ? (document.documentElement.classList.contains('dark') 
              ? '/src/assets/backgrounds/mobile_dark.jpg' 
              : '/src/assets/backgrounds/mobile_light.png')
            : window.innerWidth <= 1023
            ? (document.documentElement.classList.contains('dark') 
              ? '/src/assets/backgrounds/tablet_dark.jpg' 
              : '/src/assets/backgrounds/tablet_light.png')
            : (document.documentElement.classList.contains('dark') 
              ? '/src/assets/backgrounds/desktop_dark.jpg' 
              : '/src/assets/backgrounds/desktop_light.png')
          : ''
      })`,
      backgroundRepeat: 'no-repeat',
      backgroundSize: 'cover',
      backgroundPosition: 'bottom center',
      backgroundAttachment: 'fixed'
    }}>
      <DesktopSidebar />
      
      <div className="lg:pl-64">
        {/* Mobile/Tablet Header */}
        <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-md shadow-sm border-b border-border">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            
            {/* PERFIL À ESQUERDA - ANTES do Soliv */}
            <div 
              className="w-8 h-8 rounded-full bg-primary flex items-center justify-center cursor-pointer" 
              onClick={() => navigate('/profile')}
            >
              <span className="text-primary-foreground text-sm font-medium">
                {firstName.charAt(0).toUpperCase()}
              </span>
            </div>
            
            {/* SOLIV CENTRALIZADO */}
            <div className="flex items-center space-x-2 absolute left-1/2 transform -translate-x-1/2">
              <Sun className="w-6 h-6 text-primary" />
              <span className="text-xl font-bold text-foreground">Soliv</span>
            </div>
            
            {/* NOTIFICAÇÕES À DIREITA - DEPOIS do Soliv */}
            <button 
              className="relative p-2 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => navigate('/notifications')}
            >
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full"></span>
            </button>
          </div>
        </header>

        {/* Desktop Header */}
        <header className="hidden lg:block bg-card/80 backdrop-blur-md border-b border-border p-6">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Olá, {firstName}!
              </h1>
              <p className="text-muted-foreground">Como você está se sentindo hoje?</p>
            </div>
            <div className="flex items-center gap-4">
              {moodEnabled && (
                <button
                  onClick={() => setShowMoodModal(true)}
                  className="flex items-center gap-2 p-3 rounded-xl bg-card/80 backdrop-blur-sm border border-border hover:border-primary transition-all duration-200"
                >
                  {currentMood ? (
                    <>
                      <span className="text-2xl">{currentMood}</span>
                      <span className="text-sm font-medium text-foreground">Humor registrado</span>
                    </>
                  ) : (
                    <>
                      <span className="text-2xl">😊</span>
                      <span className="text-sm font-medium text-foreground">Registrar humor</span>
                    </>
                  )}
                </button>
              )}
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
            {isLoading ? (
              <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center space-y-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="text-sm text-muted-foreground">Carregando...</p>
                </div>
              </div>
            ) : (
              <>
            {/* Mobile/Tablet Greeting Section */}
            {moodEnabled && (
              <section className="lg:hidden mb-8">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h1 className="text-2xl font-bold text-foreground">Olá, <span className="text-primary">{firstName}</span>! 👋</h1>
                    <p className="text-muted-foreground">Como você está se sentindo hoje?</p>
                  </div>
                </div>

                {/* Mood Button */}
                <button
                  onClick={() => setShowMoodModal(true)}
                  className="w-full p-4 rounded-xl bg-card/80 backdrop-blur-sm border border-border hover:border-primary transition-all duration-200 active:scale-95"
                >
                  <div className="flex items-center justify-center space-x-3">
                    {currentMood ? (
                      <>
                        <span className="text-3xl">{currentMood}</span>
                        <span className="text-foreground font-medium">Humor registrado hoje</span>
                      </>
                    ) : (
                      <>
                        <span className="text-3xl">😊</span>
                        <span className="text-foreground font-medium">Registrar humor do dia</span>
                      </>
                    )}
                  </div>
                </button>
              </section>
            )}


            {/* Resources Section - Improved Grid */}
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-foreground mb-4">Seus recursos</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {features.map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <div 
                      key={index} 
                      className="bg-card/80 backdrop-blur-sm rounded-xl p-4 border transition-colors group cursor-pointer shadow-sm hover:border-primary/50"
                      style={{ borderColor: feature.color }}
                      onClick={feature.onClick}
                    >
                      <div className="flex flex-col items-center text-center">
                        <div 
                          className="w-12 h-12 rounded-lg flex items-center justify-center mb-3 group-hover:scale-105 transition-transform"
                          style={{ backgroundColor: `${feature.color}20` }}
                        >
                          <Icon className="w-6 h-6 opacity-60" style={{ color: feature.color }} />
                        </div>
                        <h3 className="font-semibold text-foreground mb-1 text-sm lg:text-base opacity-60">{feature.title}</h3>
                        {!isMobile && (
                          <p className="text-xs text-muted-foreground opacity-60">{feature.subtitle}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
              </>
            )}
          </div>
        </main>
      </div>

      {/* Bottom Navigation - Only on Mobile/Tablet */}
      <div className="lg:hidden">
        <BottomNavigation onSOSClick={() => setShowSOSModal(true)} />
      </div>

      {/* Modals */}
      {moodEnabled && (
        <MoodSelectionModal
          open={showMoodModal}
          onOpenChange={setShowMoodModal}
          onMoodSelected={handleMoodSelected}
          currentMood={currentMood}
        />
      )}

      <ConfirmationModal
        open={showSOSModal}
        onOpenChange={setShowSOSModal}
        onConfirm={handleSOSConfirm}
      />
    </div>
  );
};

export default HomePage;