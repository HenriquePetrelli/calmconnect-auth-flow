import { Target, CheckCircle2, TrendingUp, Music, BookOpen, Heart, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { WeeklyGoal } from '@/hooks/useWeeklyGoals';

interface GoalCardProps {
  goal: WeeklyGoal;
}

const categoryIcons: Record<string, typeof Target> = {
  'Respiração': TrendingUp,
  'Diário': BookOpen,
  'Sono': Music,
  'Humor': Heart,
  'Consulta': Calendar,
};

const categoryColors: Record<string, string> = {
  'Respiração': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  'Diário': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  'Sono': 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  'Humor': 'bg-pink-500/10 text-pink-600 border-pink-500/20',
  'Consulta': 'bg-green-500/10 text-green-600 border-green-500/20',
};

export const GoalCard = ({ goal }: GoalCardProps) => {
  const Icon = goal.category ? categoryIcons[goal.category] || Target : Target;
  const progressPercentage = Math.round((goal.progress / goal.target) * 100);
  const categoryColor = goal.category ? categoryColors[goal.category] || 'bg-primary/10 text-primary border-primary/20' : 'bg-primary/10 text-primary border-primary/20';

  return (
    <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-300 border-2">
      {goal.completed && (
        <div className="absolute top-3 right-3 z-10">
          <Badge className="bg-green-500/90 text-white flex items-center gap-1 px-3 py-1.5">
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
            <CardTitle className="text-lg font-semibold mb-1">{goal.title}</CardTitle>
            {goal.category && (
              <Badge variant="outline" className="mb-2">
                {goal.category}
              </Badge>
            )}
            <CardDescription className="text-sm">{goal.description}</CardDescription>
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
            <p className="text-xs text-muted-foreground text-center">
              Você está a <span className="font-semibold text-foreground">{goal.target - goal.progress}</span> {goal.target - goal.progress === 1 ? 'passo' : 'passos'} de completar sua meta! 🎯
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
