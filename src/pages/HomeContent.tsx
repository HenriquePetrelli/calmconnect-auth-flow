import { 
  Calendar, 
  MessageCircle, 
  Users2, 
  Activity, 
  Headphones, 
  TrendingUp, 
  BookOpen,
  ArrowUpRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MoodAccordion } from "@/components/MoodAccordion";
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
        setTodayMoodValue(null);
      } else {
        setTodayMoodValue(patientData.last_mood_value);
      }
    } catch (error) {
      console.error('Error checking today mood:', error);
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

  const handleMoodSelected = (value: number) => {
    setTodayMoodValue(value);
  };

  const firstName = userProfile?.user_metadata?.full_name?.split(' ')[0] || 'Usuário';

  const features = [
    {
      icon: Activity,
      title: "Respiração Guiada",
      subtitle: "Exercícios de relaxamento",
      onClick: () => navigate('/breathing'),
      color: 'hsl(158,64%,42%)',      // esmeralda — calma
      bg: 'hsl(152,68%,96%)',
      border: 'hsl(152,55%,86%)',
      iconBg: 'hsl(158,64%,42%)',
    },
    {
      icon: Headphones,
      title: "Sons Terapêuticos",
      subtitle: "Áudios calmantes",
      onClick: () => navigate('/sounds'),
      color: 'hsl(262,72%,52%)',      // violeta — foco/relaxamento
      bg: 'hsl(268,80%,97%)',
      border: 'hsl(268,60%,90%)',
      iconBg: 'hsl(262,72%,52%)',
    },
    {
      icon: Users2,
      title: "Grupos de Apoio",
      subtitle: "Suporte da comunidade",
      onClick: () => navigate('/support-groups'),
      color: 'hsl(199,89%,42%)',      // azul-céu — conexão
      bg: 'hsl(204,94%,96%)',
      border: 'hsl(204,80%,88%)',
      iconBg: 'hsl(199,89%,42%)',
    },
    {
      icon: BookOpen,
      title: "Meu Diário",
      subtitle: "Registros pessoais",
      onClick: () => navigate('/journal'),
      color: 'hsl(14,86%,52%)',       // coral quente — expressão
      bg: 'hsl(24,100%,96%)',
      border: 'hsl(24,90%,88%)',
      iconBg: 'hsl(14,86%,52%)',
    }
  ];

  if (isLoading) {
    return <PageSkeleton type="home" />;
  }

  return (
    <div className="px-4 lg:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Mobile/Tablet Mood Section */}
        {moodEnabled && (
          <section className="lg:hidden mb-8">
            <MoodAccordion
              currentValue={todayMoodValue}
              onMoodSelected={handleMoodSelected}
            />
          </section>
        )}

        {/* Desktop Mood Section */}
        {moodEnabled && (
          <div className="hidden lg:block mb-8">
            <MoodAccordion
              currentValue={todayMoodValue}
              onMoodSelected={handleMoodSelected}
            />
          </div>
        )}

        {/* Resources Section */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">Seus recursos</h2>

          {/* Desktop: horizontal cards in 2 columns */}
          <div className="hidden lg:grid grid-cols-2 gap-4">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <button
                  key={index}
                  onClick={feature.onClick}
                  className="group relative overflow-hidden flex items-center gap-4 rounded-2xl border p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  style={{ backgroundColor: feature.bg, borderColor: feature.border }}
                >
                  <div
                    className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-white shadow-sm transition-transform duration-200 group-hover:scale-105 group-hover:rotate-3"
                    style={{ backgroundColor: feature.iconBg, boxShadow: `0 6px 16px -6px ${feature.color}` }}
                  >
                    <Icon className="h-6 w-6" strokeWidth={2.25} />
                  </div>
                  <div className="relative min-w-0 flex-1">
                    <h3 className="text-[15px] font-semibold leading-tight" style={{ color: feature.color }}>{feature.title}</h3>
                    <p className="mt-1 text-sm leading-snug text-foreground/70">{feature.subtitle}</p>
                  </div>
                  <ArrowUpRight
                    className="relative h-4 w-4 flex-shrink-0 opacity-60 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100"
                    style={{ color: feature.color }}
                  />
                </button>
              );
            })}
          </div>

          {/* Mobile/Tablet: square cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 lg:hidden">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <button
                  key={index}
                  onClick={feature.onClick}
                  className="group relative overflow-hidden flex aspect-square flex-col items-start justify-between rounded-2xl border p-4 text-left shadow-sm transition-all duration-200 active:scale-[0.98] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  style={{ backgroundColor: feature.bg, borderColor: feature.border }}
                >
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full opacity-25 blur-xl"
                    style={{ backgroundColor: feature.color }}
                  />
                  <div
                    className="relative flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-sm transition-transform duration-200 group-active:scale-95"
                    style={{ backgroundColor: feature.iconBg, boxShadow: `0 6px 16px -6px ${feature.color}` }}
                  >
                    <Icon className="h-[22px] w-[22px]" strokeWidth={2.25} />
                  </div>
                  <div className="relative w-full">
                    <h3 className="text-sm font-semibold leading-tight" style={{ color: feature.color }}>{feature.title}</h3>
                    <p className="mt-0.5 text-xs leading-snug text-foreground/70 line-clamp-2">{feature.subtitle}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Modals */}

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