import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Clock,
  Calendar,
  Activity,
  Zap,
  Wind,
  Music,
  Trophy,
  History,
  Target,
  CheckCircle2,
  Flame,
  TrendingUp,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePatientStatistics } from "@/hooks/usePatientStatistics";
import { useAchievements } from "@/hooks/useAchievements";
import { getRelativeTime, formatDateTime } from "@/utils/dateFormatters";
import { useWeeklyGoals } from "@/hooks/useWeeklyGoals";
import { GoalSelectionModal } from "@/components/goals/GoalSelectionModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
    {children}
  </h2>
);

const Statistics = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { recentActivities, statistics, loading, updateStreak } = usePatientStatistics();
  const { checkAchievements } = useAchievements();
  const { selectedGoals, fetchDefaultGoals, loading: goalsLoading, fetchSelectedGoals } = useWeeklyGoals();
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [goalTemplates, setGoalTemplates] = useState<any[]>([]);
  const [goalsWithProgress, setGoalsWithProgress] = useState<any[]>([]);
  const [localSelectedGoals, setLocalSelectedGoals] = useState<string[]>(selectedGoals);

  useEffect(() => {
    const init = async () => {
      await updateStreak();
      await checkAchievements();
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setLocalSelectedGoals(selectedGoals);
  }, [selectedGoals]);

  useEffect(() => {
    const loadGoalsData = async () => {
      const templates = await fetchDefaultGoals();
      setGoalTemplates(templates);
      const data = localSelectedGoals
        .map((goalId) => {
          const template = templates.find((t) => t.id === goalId);
          if (!template) return null;
          return {
            id: goalId,
            title: template.title,
            description: template.description,
            target: template.target,
            progress: 0,
            completed: false,
          };
        })
        .filter(Boolean);
      setGoalsWithProgress(data);
    };
    if (!goalsLoading) loadGoalsData();
  }, [localSelectedGoals, goalsLoading, fetchDefaultGoals]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel("patients-weekly-goals-changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "patients",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newGoals = (payload.new as any)?.weekly_goals || [];
          setLocalSelectedGoals(newGoals);
          fetchSelectedGoals();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchSelectedGoals]);

  const completedGoals = goalsWithProgress.filter((g) => g.completed).length;
  const totalGoals = goalsWithProgress.length;
  const goalsPercent = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

  const statCards = [
    {
      icon: Activity,
      value: statistics?.total_scheduled_consultations || 0,
      label: "Consultas agendadas",
      accent: "text-primary",
      bg: "bg-primary/10",
    },
    {
      icon: Zap,
      value: statistics?.total_emergency_consultations || 0,
      label: "Emergenciais",
      accent: "text-destructive",
      bg: "bg-destructive/10",
    },
    {
      icon: Wind,
      value: `${statistics?.total_guided_breathing_time || 0} min`,
      label: "Respiração guiada",
      accent: "text-[hsl(var(--breathing-primary))]",
      bg: "bg-[hsl(var(--breathing-primary)/0.1)]",
    },
    {
      icon: Music,
      value: `${statistics?.total_therapeutic_sound_time || 0} min`,
      label: "Sons terapêuticos",
      accent: "text-secondary",
      bg: "bg-secondary/10",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-8">
        {/* HERO: Streak + Overview */}
        <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 md:p-7">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-center">
            <div className="md:col-span-2 space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Seu progresso
              </p>
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
                Continue firme na sua jornada
              </h1>
              <p className="text-sm text-muted-foreground max-w-md">
                Acompanhe sua evolução, mantenha sua sequência ativa e alcance suas metas semanais.
              </p>
            </div>
            <div className="flex items-center gap-4 md:justify-end">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-glow shadow-primary">
                <Flame className="h-8 w-8 text-primary-foreground" />
              </div>
              <div>
                <div className="text-3xl font-semibold text-foreground leading-none">
                  {statistics?.streak_days || 0}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  dias consecutivos
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* WEEKLY GOALS */}
        {!goalsLoading && (
          <section>
            <div className="flex items-end justify-between mb-3">
              <SectionLabel>Metas da semana</SectionLabel>
              {totalGoals > 0 && (
                <span className="text-xs text-muted-foreground">
                  {completedGoals}/{totalGoals} concluídas
                </span>
              )}
            </div>
            <Card>
              <CardContent className="p-5">
                {localSelectedGoals.length === 0 ? (
                  <div className="text-center py-6 space-y-3">
                    <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Target className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-foreground">
                        Ainda sem metas semanais
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Adicione metas para acompanhar seu progresso.
                      </p>
                    </div>
                    <Button onClick={() => setGoalModalOpen(true)} className="gap-2">
                      <Target size={16} />
                      Adicionar metas
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-medium text-foreground">
                            Progresso geral
                          </span>
                          <span className="text-sm font-semibold text-primary">
                            {goalsPercent}%
                          </span>
                        </div>
                        <Progress value={goalsPercent} className="h-2" />
                      </div>
                    </div>

                    <div className="space-y-4 pt-1">
                      {goalsWithProgress.map((goal) => {
                        const pct = Math.min(
                          100,
                          Math.round((goal.progress / goal.target) * 100)
                        );
                        return (
                          <div key={goal.id} className="space-y-2">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-sm font-medium text-foreground truncate">
                                  {goal.title}
                                </span>
                                {goal.completed && (
                                  <CheckCircle2 size={16} className="text-success shrink-0" />
                                )}
                              </div>
                              <span className="text-xs font-medium text-muted-foreground shrink-0">
                                {goal.progress}/{goal.target}
                              </span>
                            </div>
                            <Progress value={pct} className="h-1.5" />
                            {goal.description && (
                              <p className="text-xs text-muted-foreground">
                                {goal.description}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <Button
                      onClick={() => setGoalModalOpen(true)}
                      variant="outline"
                      size="sm"
                      className="w-full gap-2"
                    >
                      <Target size={14} />
                      Editar metas
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        )}

        {/* STATS OVERVIEW */}
        <section>
          <SectionLabel>Visão geral</SectionLabel>
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-28 rounded-xl border bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {statCards.map((s, i) => (
                <Card key={i} className="transition-colors hover:bg-muted/30">
                  <CardContent className="p-4">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${s.bg}`}>
                      <s.icon className={`w-4.5 h-4.5 ${s.accent}`} size={18} />
                    </div>
                    <div className="text-2xl font-semibold text-foreground leading-none">
                      {s.value}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1.5">
                      {s.label}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* QUICK ACTIONS */}
        <section>
          <SectionLabel>Explorar</SectionLabel>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={() => navigate("/achievements")}
              className="group flex items-center gap-3 rounded-xl border bg-card p-4 text-left transition-colors hover:bg-muted/40"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground">
                  Minhas conquistas
                </div>
                <div className="text-xs text-muted-foreground">
                  Veja as insígnias que você desbloqueou
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </button>

            <button
              onClick={() => navigate("/statistics/activity-history")}
              className="group flex items-center gap-3 rounded-xl border bg-card p-4 text-left transition-colors hover:bg-muted/40"
            >
              <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                <History className="w-5 h-5 text-secondary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground">
                  Histórico completo
                </div>
                <div className="text-xs text-muted-foreground">
                  Todas as suas atividades registradas
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </section>

        {/* RECENT ACTIVITIES */}
        <section>
          <div className="flex items-end justify-between mb-3">
            <SectionLabel>Atividades recentes</SectionLabel>
            <TrendingUp className="w-4 h-4 text-muted-foreground mb-3" />
          </div>
          <Card>
            <CardContent className="p-2">
              {loading ? (
                <div className="text-center py-10 text-sm text-muted-foreground">
                  Carregando atividades...
                </div>
              ) : recentActivities.length === 0 ? (
                <div className="text-center py-10">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    Nenhuma atividade recente
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {recentActivities.map((activity, index) => (
                    <li
                      key={index}
                      className="flex items-center justify-between gap-3 px-3 py-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <Activity className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {activity.name}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Calendar size={11} />
                            {formatDateTime(activity.date)}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-primary shrink-0">
                        {getRelativeTime(activity.date)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </section>
      </div>

      <GoalSelectionModal
        open={goalModalOpen}
        onOpenChange={setGoalModalOpen}
        onGoalsAdded={async () => {
          setGoalModalOpen(false);
          await fetchSelectedGoals();
        }}
      />
    </div>
  );
};

export default Statistics;
