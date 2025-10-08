import { Button } from '@/components/ui/button';
import { ArrowLeft, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWeeklyGoals } from '@/hooks/useWeeklyGoals';
import { GoalCard } from '@/components/goals/GoalCard';
import { GoalCompletionModal } from '@/components/goals/GoalCompletionModal';
import { motion } from 'framer-motion';

const WeeklyGoals = () => {
  const navigate = useNavigate();
  const { goals, loading, newlyCompleted, dismissCompletionModal } = useWeeklyGoals();

  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center gap-4 p-4 border-b border-border">
        <Button variant="ghost" size="sm" onClick={() => navigate('/statistics')}>
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-xl font-semibold text-foreground">Minhas Metas Semanais</h1>
      </div>

      <div className="p-4 pb-24">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : goals.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {goals.map((goal, index) => (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <GoalCard goal={goal} />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-16 px-4"
          >
            <div className="w-32 h-32 bg-primary/10 rounded-full flex items-center justify-center mb-6">
              <Target className="h-16 w-16 text-primary" />
            </div>
            
            <h2 className="text-2xl font-bold text-foreground mb-2 text-center">
              Nenhuma Meta Ativa
            </h2>
            
            <p className="text-muted-foreground text-center max-w-md mb-8">
              Você ainda não tem metas para esta semana. Que tal criar uma nova meta de autocuidado e começar sua jornada de bem-estar?
            </p>

            <div className="w-full max-w-md bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
              <h3 className="font-semibold text-foreground mb-3">💡 Sugestões de Metas:</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Praticar respiração guiada 5 vezes</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Registrar humor todos os dias</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Escrever no diário 3 vezes</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Ouvir sons terapêuticos 4 vezes</span>
                </li>
              </ul>
            </div>
          </motion.div>
        )}
      </div>

      <GoalCompletionModal 
        goal={newlyCompleted} 
        onClose={dismissCompletionModal} 
      />
    </div>
  );
};

export default WeeklyGoals;
