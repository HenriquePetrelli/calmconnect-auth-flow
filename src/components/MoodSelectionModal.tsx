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

  useEffect(() => {
    setSelectedMood(currentMood);
  }, [currentMood]);

  const handleMoodSelect = async (mood: typeof moods[0]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];
      const { data: patientData, error: fetchError } = await supabase
        .from('patients')
        .select('daily_mood_count, daily_mood_sum, last_mood_date')
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        console.error('Error fetching patient data:', fetchError);
        return;
      }

      const isNewDay = !patientData?.last_mood_date || patientData.last_mood_date !== today;
      
      const newCount = isNewDay ? 1 : (patientData?.daily_mood_count || 0) + 1;
      const newSum = isNewDay ? mood.value : (patientData?.daily_mood_sum || 0) + mood.value;

      const { error: updateError } = await supabase
        .from('patients')
        .update({
          daily_mood_count: newCount,
          daily_mood_sum: newSum,
          last_mood_date: today
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
    }
  };

  const handleHideMoodDaily = () => {
    setHideMoodDaily(true);
    onOpenChange(false);
    toast({
      title: "Humor diário ocultado",
      description: "Você pode reativar nas configurações do perfil.",
    });
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
                className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${
                  selectedMood === mood.emoji
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <span className="text-4xl mb-2">{mood.emoji}</span>
                <span className="text-sm font-medium">{mood.label}</span>
              </button>
            ))}
          </div>
          
          {/* Second row: Neutro spanning two columns */}
          <div className="mb-4">
            <button
              onClick={() => handleMoodSelect(moods[2])}
              className={`w-full flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${
                selectedMood === moods[2].emoji
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <span className="text-5xl mb-2">{moods[2].emoji}</span>
              <span className="text-base font-medium">{moods[2].label}</span>
            </button>
          </div>
          
          {/* Third row: Triste and Irritado */}
          <div className="grid grid-cols-2 gap-4">
            {moods.slice(3, 5).map((mood) => (
              <button
                key={mood.value}
                onClick={() => handleMoodSelect(mood)}
                className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${
                  selectedMood === mood.emoji
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <span className="text-4xl mb-2">{mood.emoji}</span>
                <span className="text-sm font-medium">{mood.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={handleHideMoodDaily}
            className="text-sm text-muted-foreground"
          >
            Ocultar humor diário
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};