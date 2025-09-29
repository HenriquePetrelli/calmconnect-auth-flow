import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MoodSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMoodSelected: (mood: string, value: number) => void;
  currentMood: string | null;
}

const moods = [
  { emoji: '😀', label: 'Feliz', value: 5 },
  { emoji: '🙂', label: 'Calmo', value: 4 },
  { emoji: '😐', label: 'Neutro', value: 3 },
  { emoji: '😔', label: 'Triste', value: 2 },
  { emoji: '😡', label: 'Irritado', value: 1 }
];

export const MoodSelectionModal: React.FC<MoodSelectionModalProps> = ({
  open,
  onOpenChange,
  onMoodSelected,
  currentMood
}) => {
  const { toast } = useToast();
  const [selectedMood, setSelectedMood] = useState<string | null>(currentMood);
  const [hideMoodDaily, setHideMoodDaily] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isHiding, setIsHiding] = useState(false);

  useEffect(() => {
    setSelectedMood(currentMood);
  }, [currentMood]);

  const handleMoodSelect = async (mood: typeof moods[0]) => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];
      const { data: patientData, error: fetchError } = await supabase
        .from('patients')
        .select('daily_mood_count, daily_mood_sum, last_mood_date, last_mood_value')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching patient data:', fetchError);
        return;
      }

      const isNewDay = !patientData?.last_mood_date || patientData.last_mood_date !== today;
      
      let newCount, newSum;
      
      if (isNewDay) {
        // Novo dia: incrementar count e somar o valor
        newCount = (patientData?.daily_mood_count || 0) + 1;
        newSum = (patientData?.daily_mood_sum || 0) + mood.value;
      } else {
        // Mesmo dia: substituir valor (descontar o antigo, somar o novo, manter count)
        const previousMoodValue = patientData?.last_mood_value || 0;
        newCount = patientData?.daily_mood_count || 1; // Manter o count do dia
        newSum = (patientData?.daily_mood_sum || 0) - previousMoodValue + mood.value;
      }

      const { error: updateError } = await supabase
        .from('patients')
        .update({
          daily_mood_count: newCount,
          daily_mood_sum: newSum,
          last_mood_date: today,
          last_mood_value: mood.value
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating mood:', updateError);
        toast({
          title: "Erro",
          description: "Não foi possível salvar seu humor. Tente novamente.",
          variant: "destructive"
        });
        return;
      }

      setSelectedMood(mood.emoji);
      onMoodSelected(mood.emoji, mood.value);
      onOpenChange(false);
      
      toast({
        title: "Humor registrado!",
        description: `Obrigado por compartilhar que você está ${mood.label.toLowerCase()}.`,
      });
    } catch (error) {
      console.error('Error saving mood:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar seu humor. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleHideMoodDaily = async () => {
    // Dispatch event immediately to hide section
    window.dispatchEvent(new CustomEvent('moodToggleChanged', { 
      detail: { enabled: false } 
    }));

    setIsHiding(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('patients')
        .update({ daily_mood_enabled: false })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error hiding daily mood:', error);
        // Revert state on error
        window.dispatchEvent(new CustomEvent('moodToggleChanged', { 
          detail: { enabled: true } 
        }));
        toast({
          title: "Erro",
          description: "Não foi possível ocultar o humor diário. Tente novamente.",
          variant: "destructive"
        });
        return;
      }

      onOpenChange(false);
      toast({
        title: "Humor diário ocultado",
        description: "Você pode reativar nas configurações do perfil.",
      });
    } catch (error) {
      console.error('Error hiding daily mood:', error);
      // Revert state on error
      window.dispatchEvent(new CustomEvent('moodToggleChanged', { 
        detail: { enabled: true } 
      }));
      toast({
        title: "Erro",
        description: "Não foi possível ocultar o humor diário. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsHiding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-semibold">
            Como você está se sentindo hoje?
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-6">
          {/* Grid layout as specified */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* First row: Feliz and Calmo */}
            {moods.slice(0, 2).map((mood) => (
              <button
                key={mood.value}
                onClick={() => handleMoodSelect(mood)}
                disabled={isLoading}
                className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${
                  selectedMood === mood.emoji
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                {isLoading ? (
                  <div className="w-10 h-10 mb-2 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span className="text-4xl mb-2">{mood.emoji}</span>
                )}
                <span className="text-sm font-medium">{mood.label}</span>
              </button>
            ))}
          </div>
          
          {/* Second row: Neutro spanning two columns */}
          <div className="mb-4">
            <button
              onClick={() => handleMoodSelect(moods[2])}
              disabled={isLoading}
              className={`w-full flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${
                selectedMood === moods[2].emoji
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              {isLoading ? (
                <div className="w-12 h-12 mb-2 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className="text-5xl mb-2">{moods[2].emoji}</span>
              )}
              <span className="text-base font-medium">{moods[2].label}</span>
            </button>
          </div>
          
          {/* Third row: Triste and Irritado */}
          <div className="grid grid-cols-2 gap-4">
            {moods.slice(3, 5).map((mood) => (
              <button
                key={mood.value}
                onClick={() => handleMoodSelect(mood)}
                disabled={isLoading}
                className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${
                  selectedMood === mood.emoji
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                {isLoading ? (
                  <div className="w-10 h-10 mb-2 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span className="text-4xl mb-2">{mood.emoji}</span>
                )}
                <span className="text-sm font-medium">{mood.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={handleHideMoodDaily}
            disabled={isHiding}
            className="text-sm text-muted-foreground"
          >
            {isHiding ? (
              <>
                <div className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Ocultando...
              </>
            ) : (
              'Ocultar humor diário'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};