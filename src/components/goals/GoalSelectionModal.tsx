import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { useWeeklyGoals, WeeklyGoalTemplate } from '@/hooks/useWeeklyGoals';
import { Loader2 } from 'lucide-react';

interface GoalSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGoalsAdded: () => void;
}

export const GoalSelectionModal = ({ 
  open, 
  onOpenChange,
  onGoalsAdded 
}: GoalSelectionModalProps) => {
  const [tempSelectedGoals, setTempSelectedGoals] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [goalOptions, setGoalOptions] = useState<WeeklyGoalTemplate[]>([]);
  const { selectedGoals, fetchDefaultGoals, updateSelectedGoals } = useWeeklyGoals();

  useEffect(() => {
    if (open) {
      loadGoals();
      // Pre-select goals that are already in the patient's weekly_goals array
      setTempSelectedGoals(selectedGoals);
    }
  }, [open, selectedGoals]);

  const loadGoals = async () => {
    const goals = await fetchDefaultGoals();
    setGoalOptions(goals);
  };

  const handleToggleGoal = (goalId: string) => {
    setTempSelectedGoals(prev => 
      prev.includes(goalId) 
        ? prev.filter(id => id !== goalId)
        : [...prev, goalId]
    );
  };

  const handleSaveGoals = async () => {
    if (tempSelectedGoals.length === 0) return;

    setLoading(true);
    try {
      await updateSelectedGoals(tempSelectedGoals);
      onGoalsAdded();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving goals:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Escolha suas metas semanais</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {goalOptions.map((goal, index) => {
            const isSelected = tempSelectedGoals.includes(goal.id);

            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Label
                  htmlFor={goal.id}
                  className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    isSelected 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Checkbox
                    id={goal.id}
                    checked={isSelected}
                    onCheckedChange={() => handleToggleGoal(goal.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{goal.title}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {goal.description}
                    </p>
                  </div>
                </Label>
              </motion.div>
            );
          })}
        </div>

        <DialogFooter>
          <Button
            onClick={handleSaveGoals}
            disabled={tempSelectedGoals.length === 0 || loading}
            size="lg"
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              `Salvar ${tempSelectedGoals.length > 0 ? `(${tempSelectedGoals.length})` : ''}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
