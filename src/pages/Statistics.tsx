import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Clock, Calendar, Activity, Zap, Wind, Music, Trophy, History, Target, CheckCircle2, Flame } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePatientStatistics } from "@/hooks/usePatientStatistics";
import { useAchievements } from "@/hooks/useAchievements";
import { getRelativeTime, formatDateTime } from "@/utils/dateFormatters";
import { useWeeklyGoals } from "@/hooks/useWeeklyGoals";
import { GoalSelectionModal } from "@/components/goals/GoalSelectionModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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

  // Update streak and check achievements when page loads (only once)
  useEffect(() => {
    const initializePage = async () => {
      await updateStreak();
      await checkAchievements();
    };
    
    initializePage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync local state with hook state
  useEffect(() => {
    setLocalSelectedGoals(selectedGoals);
  }, [selectedGoals]);

  // Load goal templates and combine with selected goals
  useEffect(() => {
    const loadGoalsData = async () => {
      const templates = await fetchDefaultGoals();
      setGoalTemplates(templates);
      
      // Get goals with their progress
      const goalsWithProgressData = localSelectedGoals.map(goalId => {
        const template = templates.find(t => t.id === goalId);
        if (!template) return null;
        
        // TODO: Fetch actual progress from database or calculate it
        // For now, using dummy progress
        return {
          id: goalId,
          title: template.title,
          description: template.description,
          target: template.target,
          progress: 0, // This should come from actual tracking
          completed: false
        };
      }).filter(Boolean);
      
      setGoalsWithProgress(goalsWithProgressData);
    };

    if (!goalsLoading) {
      loadGoalsData();
    }
  }, [localSelectedGoals, goalsLoading, fetchDefaultGoals]);

  // Realtime subscription to detect changes in weekly_goals
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('patients-weekly-goals-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'patients',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Weekly goals updated in realtime:', payload);
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

  return (
    <div className="min-h-screen bg-background">
      {/* Content */}
      <div className="p-4 space-y-6">

        {/* Weekly Goals Section */}
        {!goalsLoading && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="text-primary" size={20} />
                Metas Semanais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {localSelectedGoals.length === 0 ? (
                <div className="text-center py-8 space-y-4">
                  <div className="text-4xl mb-2">🎯</div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Ainda sem metas semanais
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Adicione metas para acompanhar seu progresso durante a semana
                    </p>
                  </div>
                  <Button
                    onClick={() => setGoalModalOpen(true)}
                    className="flex items-center justify-center gap-2"
                    size="lg"
                  >
                    <Target size={20} />
                    Adicionar metas da semana
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {goalsWithProgress.map((goal) => (
                      <div key={goal.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">
                              {goal.title}
                            </span>
                            {goal.completed && (
                              <CheckCircle2 size={18} className="text-success" />
                            )}
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {goal.progress}/{goal.target}
                          </span>
                        </div>
                        <Progress 
                          value={(goal.progress / goal.target) * 100} 
                          className="h-2"
                        />
                        <p className="text-xs text-muted-foreground">
                          {goal.description}
                        </p>
                      </div>
                    ))}
                  </div>
                  <Button
                    onClick={() => setGoalModalOpen(true)}
                    variant="outline"
                    className="w-full flex items-center justify-center gap-2"
                  >
                    <Target size={18} />
                    Editar metas semanais
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-1 gap-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button
              onClick={() => navigate('/achievements')}
              className="w-full flex items-center justify-center gap-2"
              size="lg"
              variant="outline"
            >
              <Trophy size={20} />
              Ver Minhas Conquistas
            </Button>
            
            <Button
              onClick={() => navigate('/statistics/activity-history')}
              className="w-full flex items-center justify-center gap-2"
              size="lg"
              variant="outline"
            >
              <History size={20} />
              Ver Histórico de Atividades
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Carregando estatísticas...
          </div>
        ) : (
          <>
            {/* Overview Stats */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <Activity className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <div className="text-2xl font-bold text-primary">
                    {statistics?.total_scheduled_consultations || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Consultas Agendadas</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <Zap className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <div className="text-2xl font-bold text-primary">
                    {statistics?.total_emergency_consultations || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Consultas Emergenciais</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <Wind className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <div className="text-2xl font-bold text-primary">
                    {statistics?.total_guided_breathing_time || 0} min
                  </div>
                  <div className="text-sm text-muted-foreground">Respiração Guiada</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <Music className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <div className="text-2xl font-bold text-primary">
                    {statistics?.total_therapeutic_sound_time || 0} min
                  </div>
                  <div className="text-sm text-muted-foreground">Sons Terapêuticos</div>
                </CardContent>
              </Card>
            </div>

            {/* Streak Card */}
            <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
              <CardContent className="p-6 text-center">
                <div className="text-4xl mb-2">🔥</div>
                <div className="text-3xl font-bold text-primary mb-1">
                  {statistics?.streak_days || 0}
                </div>
                <div className="text-sm text-muted-foreground">
                  Dias consecutivos usando o app
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="text-primary" size={20} />
              Atividades Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando atividades...
              </div>
            ) : recentActivities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma atividade recente
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivities.map((activity, index) => (
                  <div
                    key={index}
                    className="flex flex-col gap-2 p-4 rounded-lg border bg-gradient-to-r from-muted/30 to-transparent"
                  >
                    <div className="flex items-start justify-between">
                      <p className="font-semibold text-base">{activity.name}</p>
                      <span className="text-sm font-medium text-primary flex items-center gap-1">
                        <Clock size={14} />
                        {getRelativeTime(activity.date)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar size={12} />
                      {formatDateTime(activity.date)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Goal Selection Modal */}
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
