import { Target, CheckCircle2, TrendingUp, Music, BookOpen, Heart, Calendar, Flag, Check, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CHALLENGES, currentStep, isChallenge, stepDoneToday } from '@/lib/challenges';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { PatientWeeklyGoal } from '@/hooks/useWeeklyGoals';

interface GoalCardProps {
  goal: PatientWeeklyGoal;
  /** Desafios de 7 dias: marcar o passo de hoje. */
  onStepDone?: (goal: PatientWeeklyGoal) => void;
}

// Chaves alinhadas com weekly_goals.category no banco (breathing, sound,
// support_group, journal, mood, appointment) — não com rótulos em português.
const categoryIcons: Record<string, typeof Target> = {
  breathing: TrendingUp,
  journal: BookOpen,
  sound: Music,
  mood: Heart,
  appointment: Calendar,
  support_group: Target,
};

const categoryColors: Record<string, string> = {
  breathing: 'bg-secondary/10 text-secondary-foreground border-blue-500/20',
  journal: 'bg-secondary/10 text-secondary-foreground border-secondary/20',
  sound: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  mood: 'bg-pink-500/10 text-pink-600 border-pink-500/20',
  appointment: 'bg-success/10 text-success border-success/20',
  support_group: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
};

const categoryLabels: Record<string, string> = {
  breathing: 'Respiração',
  journal: 'Diário',
  sound: 'Sons',
  mood: 'Humor',
  appointment: 'Consulta',
  support_group: 'Grupo de apoio',
};

/** Desafio de 7 dias: o passo de hoje, com atalho e "Fiz o passo de hoje". */
const ChallengeBody = ({ goal, onStepDone }: GoalCardProps) => {
  const navigate = useNavigate();
  const category = goal.weekly_goals.category;
  const steps = CHALLENGES[category] ?? [];
  const current = currentStep(category, goal.progress);
  const doneToday = stepDoneToday(goal.progress, goal.updated_at);

  return (
    <CardContent className="space-y-4">
      <ol className="flex gap-1" aria-label={`${goal.progress} de ${goal.target} passos feitos`}>
        {steps.map((_, i) => (
          <li key={i} className={`h-2 flex-1 rounded-full ${i < goal.progress ? 'bg-primary' : 'bg-muted'}`} aria-hidden="true" />
        ))}
      </ol>

      {current ? (
        doneToday ? (
          <p className="rounded-lg bg-success/10 p-3 text-sm text-foreground">
            <Check className="mr-1 inline h-4 w-4 text-success" aria-hidden="true" />
            Passo de hoje feito. Amanhã: <span className="font-medium">{current.step.title}</span>.
          </p>
        ) : (
          <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Dia {current.index + 1} de {steps.length}</p>
            <p className="font-semibold text-foreground">{current.step.title}</p>
            <p className="text-sm text-muted-foreground">{current.step.text}</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              {current.step.link && (
                <Button variant="outline" size="sm" className="gap-1 bg-card" onClick={() => navigate(current.step.link!.to)}>
                  {current.step.link.label}
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              )}
              {onStepDone && (
                <Button size="sm" className="gap-1" onClick={() => onStepDone(goal)}>
                  <Check className="h-4 w-4" aria-hidden="true" />
                  Fiz o passo de hoje
                </Button>
              )}
            </div>
          </div>
        )
      ) : (
        <p className="rounded-lg bg-success/10 p-3 text-sm font-medium text-foreground">Desafio concluído! Você fez os 7 passos.</p>
      )}
    </CardContent>
  );
};

export const GoalCard = ({ goal, onStepDone }: GoalCardProps) => {
  const challenge = isChallenge(goal.weekly_goals);
  const Icon = challenge ? Flag : goal.weekly_goals.category ? categoryIcons[goal.weekly_goals.category] || Target : Target;
  const progressPercentage = Math.round((goal.progress / goal.target) * 100);
  const categoryColor = goal.weekly_goals.category ? categoryColors[goal.weekly_goals.category] || 'bg-primary/10 text-primary border-primary/20' : 'bg-primary/10 text-primary border-primary/20';

  return (
    <Card className="relative overflow-hidden transition-all duration-300 border-2">
      {goal.completed && (
        <div className="absolute top-3 right-3 z-10">
          <Badge className="bg-success/90 text-white flex items-center gap-1 px-3 py-1.5">
            <CheckCircle2 className="h-4 w-4" />
            Concluída
          </Badge>
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className={`p-3 rounded-xl ${categoryColor} border`}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <CardTitle className="mb-1">{goal.weekly_goals.title}</CardTitle>
            {goal.weekly_goals.category && (
              <Badge variant="outline" className="mb-2">
                {challenge ? 'Desafio de 7 dias' : categoryLabels[goal.weekly_goals.category] || goal.weekly_goals.category}
              </Badge>
            )}
            <CardDescription className="text-sm">{goal.weekly_goals.description}</CardDescription>
          </div>
        </div>
      </CardHeader>

      {challenge ? (
        <ChallengeBody goal={goal} onStepDone={onStepDone} />
      ) : (
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground font-medium">Progresso</span>
            <span className="font-semibold text-foreground">
              {goal.progress} de {goal.target}
            </span>
          </div>
          
          <Progress 
            value={progressPercentage} 
            className="h-3"
          />
          
          <div className="text-right">
            <span className="text-lg font-bold text-primary">{progressPercentage}%</span>
          </div>
        </div>

        {!goal.completed && goal.progress > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground text-center inline-flex items-center gap-1 justify-center w-full">
              Você está a <span className="font-semibold text-foreground">{goal.target - goal.progress}</span> {goal.target - goal.progress === 1 ? 'passo' : 'passos'} de concluir esta meta na semana!
              <Target className="w-3.5 h-3.5 text-primary" />
            </p>
          </div>
        )}
      </CardContent>
      )}
    </Card>
  );
};
