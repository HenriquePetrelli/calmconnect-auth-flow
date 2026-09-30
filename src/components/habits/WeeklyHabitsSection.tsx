import { useEffect, useState } from 'react';
import { ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useWeeklyGoals } from '@/hooks/useWeeklyGoals';
import { GoalSelectionModal } from '@/components/goals/GoalSelectionModal';
import { GoalCard } from '@/components/goals/GoalCard';
import { SkeletonSectionCard } from '@/components/skeletons/Skeletons';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hábitos da semana: as atividades de autocuidado do app (respiração, sons,
 * diário, humor...) escolhidas para a semana. Antes se chamavam "metas
 * semanais"; o banco continua com os nomes antigos (weekly_goals).
 */
const WeeklyHabitsSection = () => {
  const { user } = useAuth();
  const { goals, loading, fetchGoals } = useWeeklyGoals();
  const [modalOpen, setModalOpen] = useState(false);

  // Escolha feita em outra aba/dispositivo (ou o reset automático das
  // segundas): recarrega os hábitos desta semana.
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel('patients-weekly-goals-changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'patients', filter: `user_id=eq.${user.id}` },
        () => fetchGoals(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchGoals]);

  const completed = goals.filter((g) => g.completed).length;
  const total = goals.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  if (loading) return <SkeletonSectionCard rows={3} accent="primary" showAvatar={false} />;

  return (
    <>
      <Card className="border-l-4 border-l-primary">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
          <CardTitle className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
              <ListChecks className="text-primary" size={18} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">Hábitos da semana</h3>
              <p className="text-sm text-muted-foreground font-normal">
                {total > 0 ? `${completed} de ${total} concluídos` : 'Escolha seus hábitos de autocuidado'}
              </p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {total === 0 ? (
            <div className="text-center py-6 space-y-3">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <ListChecks className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h4 className="text-base font-semibold text-foreground">Nenhum hábito escolhido para a semana</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Respiração, sons, diário, humor: escolha o que quer praticar nesta semana.
                </p>
              </div>
              <Button onClick={() => setModalOpen(true)} className="gap-2">
                <ListChecks size={16} />
                Escolher hábitos da semana
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-foreground">Progresso da semana</span>
                  <span className="text-sm font-semibold text-primary">{percent}%</span>
                </div>
                <Progress value={percent} className="h-2" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {goals.map((goal) => (
                  <GoalCard key={goal.id} goal={goal} />
                ))}
              </div>

              <Button onClick={() => setModalOpen(true)} variant="outline" size="sm" className="w-full gap-2">
                <ListChecks size={14} />
                Editar hábitos da semana
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <GoalSelectionModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onGoalsAdded={async () => {
          setModalOpen(false);
          await fetchGoals();
        }}
      />
    </>
  );
};

export default WeeklyHabitsSection;
