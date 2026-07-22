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
  ChevronRight,
  BarChart3,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePatientStatistics } from "@/hooks/usePatientStatistics";
import { useAchievements } from "@/hooks/useAchievements";
import { getRelativeTime, formatDateTime } from "@/utils/dateFormatters";
import { useWeeklyGoals } from "@/hooks/useWeeklyGoals";
import { GoalSelectionModal } from "@/components/goals/GoalSelectionModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SkeletonList } from "@/components/skeletons/Skeletons";

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
      color: "text-primary",
      bg: "bg-primary/15",
    },
    {
      icon: Zap,
      value: statistics?.total_emergency_consultations || 0,
      label: "Emergenciais",
      color: "text-destructive",
      bg: "bg-destructive/15",
    },
    {
      icon: Wind,
      value: `${statistics?.total_guided_breathing_time || 0} min`,
      label: "Respiração guiada",
      color: "text-[hsl(var(--breathing-primary))]",
      bg: "bg-[hsl(var(--breathing-primary)/0.15)]",
    },
    {
      icon: Music,
      value: `${statistics?.total_therapeutic_sound_time || 0} min`,
      label: "Sons terapêuticos",
      color: "text-secondary",
      bg: "bg-secondary/15",
    },
  ];

  return (
    <div className="space-y-6">

        {/* Streak destaque */}
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                <Flame className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                {loading ? (
                  <>
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-56" />
                  </>
                ) : (
                  <>
                    <h3 className="text-base font-semibold text-foreground leading-tight">
                      {statistics?.streak_days || 0} dias consecutivos
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Continue firme na sua jornada
                    </p>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Metas Semanais */}
        {goalsLoading ? (
          <SkeletonSectionCard rows={3} accent="primary" showAvatar={false} />
        ) : (
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
              <CardTitle className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                  <Target className="text-primary" size={18} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">Metas da semana</h3>
                  <p className="text-sm text-muted-foreground font-normal">
                    {totalGoals > 0
                      ? `${completedGoals} de ${totalGoals} concluídas`
                      : "Defina suas metas semanais"}
                  </p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {localSelectedGoals.length === 0 ? (
                <div className="text-center py-6 space-y-3">
                  <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Target className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-base font-semibold text-foreground">
                      Ainda sem metas semanais
                    </h4>
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
                  <div>
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

                  <div className="space-y-4">
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
        )}

        {/* Visão geral */}
        <Card className="border-l-4 border-l-secondary">
          <CardHeader className="bg-gradient-to-r from-secondary/5 to-transparent">
            <CardTitle className="flex items-center gap-3">
              <div className="w-10 h-10 bg-secondary/20 rounded-full flex items-center justify-center">
                <BarChart3 className="text-secondary" size={18} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">Visão geral</h3>
                <p className="text-sm text-muted-foreground font-normal">
                  Suas atividades no app
                </p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {loading ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-24 rounded-lg border bg-muted/40 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {statCards.map((s, i) => (
                  <div
                    key={i}
                    className="rounded-lg border bg-card p-4 transition-colors hover:bg-muted/30"
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${s.bg}`}>
                      <s.icon className={s.color} size={18} />
                    </div>
                    <div className="text-2xl font-semibold text-foreground leading-none">
                      {s.value}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1.5">
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Explorar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
            <CardContent className="p-4">
              <button
                onClick={() => navigate("/achievements")}
                className="flex items-center gap-3 w-full text-left"
              >
                <div className="flex-shrink-0 w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-foreground leading-tight">
                    Minhas conquistas
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Veja suas insígnias
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            </CardContent>
          </Card>

          <Card className="border-secondary/20 bg-gradient-to-r from-secondary/5 to-secondary/10">
            <CardContent className="p-4">
              <button
                onClick={() => navigate("/statistics/activity-history")}
                className="flex items-center gap-3 w-full text-left"
              >
                <div className="flex-shrink-0 w-10 h-10 bg-secondary/20 rounded-full flex items-center justify-center">
                  <History className="w-5 h-5 text-secondary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-foreground leading-tight">
                    Histórico completo
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Todas as atividades
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            </CardContent>
          </Card>
        </div>

        {/* Atividades Recentes */}
        <Card className="border-l-4 border-l-muted-foreground/30">
          <CardHeader className="bg-gradient-to-r from-muted/30 to-transparent">
            <CardTitle className="flex items-center gap-3">
              <div className="w-10 h-10 bg-muted-foreground/10 rounded-full flex items-center justify-center">
                <Clock className="text-muted-foreground" size={18} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Atividades recentes
                </h3>
                <p className="text-sm text-muted-foreground font-normal">
                  Últimos registros
                </p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {loading ? (
              <SkeletonList count={4} />
            ) : recentActivities.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  Nenhuma atividade recente
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border -mx-2">
                {recentActivities.map((activity, index) => (
                  <li
                    key={index}
                    className="flex items-center justify-between gap-3 px-2 py-3"
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
