import { Target, CheckCircle2, TrendingUp, Music, BookOpen, Heart, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { PatientWeeklyGoal } from '@/hooks/useWeeklyGoals';

interface GoalCardProps {
  goal: PatientWeeklyGoal;
}

const categoryIcons: Record<string, typeof Target> = {
  'Respiração': TrendingUp,
  'Diário': BookOpen,
  'Sono': Music,
  'Humor': Heart,
  'Consulta': Calendar,
};

const categoryColors: Record<string, string> = {
  'Respiração': 'bg-secondary/10 text-secondary border-blue-500/20',
  'Diário': 'bg-secondary/10 text-secondary border-secondary/20',
  'Sono': 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  'Humor': 'bg-pink-500/10 text-pink-600 border-pink-500/20',
  'Consulta': 'bg-success/10 text-success border-success/20',
};

export const GoalCard = ({ goal }: GoalCardProps) => {
  const Icon = goal.weekly_goals.category ? categoryIcons[goal.weekly_goals.category] || Target : Target;
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
            <CardTitle className="text-lg font-semibold mb-1">{goal.weekly_goals.title}</CardTitle>
            {goal.weekly_goals.category && (
              <Badge variant="outline" className="mb-2">
                {goal.weekly_goals.category}
              </Badge>
            )}
            <CardDescription className="text-sm">{goal.weekly_goals.description}</CardDescription>
          </div>
        </div>
      </CardHeader>

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
              Você está a <span className="font-semibold text-foreground">{goal.target - goal.progress}</span> {goal.target - goal.progress === 1 ? 'passo' : 'passos'} de completar sua meta!
              <Target className="w-3.5 h-3.5 text-primary" />
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
