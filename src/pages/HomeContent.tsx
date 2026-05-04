import { 
  Calendar, 
  MessageCircle, 
  Users2, 
  Activity, 
  Headphones, 
  TrendingUp, 
  BookOpen
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MoodSelectionModal } from "@/components/MoodSelectionModal";
import { WeeklyGoalModal } from "@/components/goals/WeeklyGoalModal";
import { GoalSelectionModal } from "@/components/goals/GoalSelectionModal";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from 'sonner';
import React from "react";
import PageSkeleton from "@/components/PageSkeleton";

const HomeContent = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const userProfile = user;
  const [currentMood, setCurrentMood] = useState<string | null>(null);
  const [showMoodModal, setShowMoodModal] = useState(false);
  const [moodEnabled, setMoodEnabled] = useState(true);
  const [todayMoodValue, setTodayMoodValue] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showWeeklyGoalModal, setShowWeeklyGoalModal] = useState(false);
  const [showGoalSelection, setShowGoalSelection] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    const loadHomeData = async () => {
      setIsLoading(true);
      await checkTodayMood();
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
  }, [user?.id]);

  const checkTodayMood = async () => {
    try {
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];
      const { data: patientData } = await supabase
        .from('patients')
        .select('last_mood_date, last_mood_value, daily_mood_enabled, show_weekly_goal_modal, show_goal_modal')
        .eq('user_id', user.id)
        .single();

      // Check if mood tracking is enabled
      setMoodEnabled(patientData?.daily_mood_enabled !== false);

      // Verificar se deve mostrar modal de metas semanais
      if (patientData?.show_weekly_goal_modal && patientData?.show_goal_modal) {
        setTimeout(() => setShowWeeklyGoalModal(true), 500);
      }

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

  const getMoodLabel = (value: number) => {
    const moods = [
      { emoji: '😀', label: 'Feliz', value: 5 },
      { emoji: '🙂', label: 'Calmo', value: 4 },
      { emoji: '😐', label: 'Neutro', value: 3 },
      { emoji: '😔', label: 'Triste', value: 2 },
      { emoji: '😡', label: 'Irritado', value: 1 }
    ];
    return moods.find(mood => mood.value === value)?.label || '';
  };

  const handleCloseWeeklyGoalModal = async () => {
    setShowWeeklyGoalModal(false);
    // Atualizar a flag no banco para não mostrar mais nesta semana
    if (userProfile?.id) {
      try {
        await supabase
          .from('patients')
          .update({ show_weekly_goal_modal: false })
          .eq('user_id', userProfile.id);
      } catch (error) {
        console.error('Error updating weekly goal modal preference:', error);
      }
    }
  };

  const handleAddGoals = () => {
    setShowWeeklyGoalModal(false);
    setShowGoalSelection(true);
  };

  const handleDontShowAgain = async () => {
    setShowWeeklyGoalModal(false);
    if (userProfile?.id) {
      try {
        await supabase
          .from('patients')
          .update({ show_goal_modal: false, show_weekly_goal_modal: false })
          .eq('user_id', userProfile.id);
        toast.success('Você poderá reativar essa opção nas configurações do perfil.');
      } catch (error) {
        console.error('Error updating goal modal preference:', error);
        toast.error('Erro ao atualizar preferência');
      }
    }
  };

  const handleGoalsAdded = async () => {
    setShowGoalSelection(false);
    // Atualizar show_weekly_goal_modal para false após adicionar metas
    if (userProfile?.id) {
      try {
        await supabase
          .from('patients')
          .update({ show_weekly_goal_modal: false })
          .eq('user_id', userProfile.id);
      } catch (error) {
        console.error('Error updating weekly goal modal:', error);
      }
    }
    toast.success('Metas semanais adicionadas com sucesso! 🌱');
  };

  const handleMoodSelected = (mood: string, value: number) => {
    setCurrentMood(mood);
    setTodayMoodValue(value);
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
    }
  ];

  if (isLoading) {
    return <PageSkeleton type="home" />;
  }

  return (
    <div className="px-4 lg:p-6">
      <div className="max-w-6xl mx-auto">
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
                    <span className="text-foreground font-medium">{getMoodLabel(todayMoodValue || 0)}</span>
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

        {/* Desktop Mood Section */}
        {moodEnabled && (
          <div className="hidden lg:flex items-center gap-4 mb-8">
            <button
              onClick={() => setShowMoodModal(true)}
              className="flex items-center gap-2 p-3 rounded-xl bg-card/80 backdrop-blur-sm border border-border hover:border-primary transition-all duration-200"
            >
              {currentMood ? (
                <>
                  <span className="text-2xl">{currentMood}</span>
                  <span className="text-sm font-medium text-foreground">{getMoodLabel(todayMoodValue || 0)}</span>
                </>
              ) : (
                <>
                  <span className="text-2xl">😊</span>
                  <span className="text-sm font-medium text-foreground">Registrar humor</span>
                </>
              )}
            </button>
          </div>
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

        {/* Modals */}
        {moodEnabled && (
          <MoodSelectionModal
            open={showMoodModal}
            onOpenChange={setShowMoodModal}
            onMoodSelected={handleMoodSelected}
            currentMood={currentMood}
          />
        )}

        <WeeklyGoalModal
          open={showWeeklyGoalModal}
          onOpenChange={handleCloseWeeklyGoalModal}
          onAddGoals={handleAddGoals}
          onDontShowAgain={handleDontShowAgain}
        />

        <GoalSelectionModal
          open={showGoalSelection}
          onOpenChange={setShowGoalSelection}
          onGoalsAdded={handleGoalsAdded}
        />
      </div>
    </div>
  );
};

export default HomeContent;