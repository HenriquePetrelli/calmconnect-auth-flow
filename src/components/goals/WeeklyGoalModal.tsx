import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Target } from 'lucide-react';

interface WeeklyGoalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddGoals: () => void;
  onDontShowAgain: () => void;
}

export const WeeklyGoalModal = ({ 
  open, 
  onOpenChange, 
  onAddGoals,
  onDontShowAgain 
}: WeeklyGoalModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center"
          >
            <Target className="h-8 w-8 text-white" />
          </motion.div>

          <DialogTitle className="text-center text-2xl">
            Defina suas metas semanais 🗓️
          </DialogTitle>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <p className="text-center text-muted-foreground">
            Deseja adicionar suas metas semanais de autocuidado?
          </p>

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button 
              onClick={onAddGoals}
              size="lg"
              className="w-full"
            >
              Adicionar metas
            </Button>
            
            <Button 
              onClick={() => onOpenChange(false)}
              variant="outline"
              size="lg"
              className="w-full"
            >
              Cancelar
            </Button>

            <button
              onClick={onDontShowAgain}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors underline mt-2"
            >
              Não exibir mais esta mensagem
            </button>
          </DialogFooter>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};