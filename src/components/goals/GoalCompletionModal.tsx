import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Trophy, Sparkles, CheckCircle2 } from 'lucide-react';
import { PatientWeeklyGoal } from '@/hooks/useWeeklyGoals';
import Confetti from 'react-confetti';
import { motion } from 'framer-motion';

interface GoalCompletionModalProps {
  goal: PatientWeeklyGoal | null;
  onClose: () => void;
}

export const GoalCompletionModal = ({ goal, onClose }: GoalCompletionModalProps) => {
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (goal) {
      setShowConfetti(true);
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });

      const timer = setTimeout(() => {
        setShowConfetti(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [goal]);

  if (!goal) return null;

  return (
    <>
      {showConfetti && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={500}
          gravity={0.3}
        />
      )}

      <Dialog open={!!goal} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 20,
              }}
              className="mx-auto mb-4 w-20 h-20 bg-gradient-to-br from-yellow-400 to-primary rounded-full flex items-center justify-center"
            >
              <Trophy className="h-10 w-10 text-white" />
            </motion.div>

            <DialogTitle className="text-center text-2xl font-bold">
              Parabéns!
            </DialogTitle>
          </DialogHeader>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-6 border border-primary/20">
              <div className="flex items-start gap-3 mb-4">
                <CheckCircle2 className="h-6 w-6 text-success flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-lg mb-1">Meta Concluída!</h3>
                  <p className="text-sm text-muted-foreground">
                    Você completou sua meta semanal:
                  </p>
                </div>
              </div>

              <div className="bg-background rounded-md p-4 border">
                <p className="font-semibold text-foreground mb-1">{goal.weekly_goals.title}</p>
                <p className="text-sm text-muted-foreground">{goal.weekly_goals.description}</p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-secondary/10 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg p-4 border border-secondary/20 dark:border-blue-800">
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="h-5 w-5 text-warning" />
                <p className="font-medium text-foreground">
                  Continue assim! Cada pequena conquista te leva mais longe no seu autocuidado.
                </p>
              </div>
            </div>

            <Button 
              onClick={onClose}
              className="w-full"
              size="lg"
            >
              Continuar
            </Button>
          </motion.div>
        </DialogContent>
      </Dialog>
    </>
  );
};
