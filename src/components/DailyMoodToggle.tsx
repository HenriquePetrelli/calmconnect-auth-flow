import React, { useState, useEffect } from 'react';
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Heart } from "lucide-react";

interface DailyMoodToggleProps {
  initialEnabled?: boolean;
  onReady?: () => void;
}

export const DailyMoodToggle: React.FC<DailyMoodToggleProps> = ({ initialEnabled = true, onReady }) => {
  const { toast } = useToast();
  const [isEnabled, setIsEnabled] = useState(initialEnabled);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchMoodSetting();
  }, []);

  const fetchMoodSetting = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: patientData } = await supabase
        .from('patients')
        .select('daily_mood_enabled')
        .eq('user_id', user.id)
        .single();

      if (patientData) {
        setIsEnabled(patientData.daily_mood_enabled !== false);
      }
    } catch (error) {
      console.error('Error fetching mood setting:', error);
    } finally {
      onReady?.();
    }
  };

  const handleToggle = async (checked: boolean) => {
    // Immediate state update and event dispatch
    setIsEnabled(checked);
    window.dispatchEvent(new CustomEvent('moodToggleChanged', { 
      detail: { enabled: checked } 
    }));

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('patients')
        .update({ daily_mood_enabled: checked })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating mood setting:', error);
        // Revert state on error
        setIsEnabled(!checked);
        window.dispatchEvent(new CustomEvent('moodToggleChanged', { 
          detail: { enabled: !checked } 
        }));
        toast({
          title: "Erro",
          description: "Não foi possível atualizar a configuração. Tente novamente.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: checked ? "Humor diário ativado" : "Humor diário desativado",
        description: checked 
          ? "Você voltará a ver o registro de humor na tela inicial." 
          : "O registro de humor foi ocultado da tela inicial.",
      });
    } catch (error) {
      console.error('Error updating mood setting:', error);
      // Revert state on error
      setIsEnabled(!checked);
      window.dispatchEvent(new CustomEvent('moodToggleChanged', { 
        detail: { enabled: !checked } 
      }));
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a configuração. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div className="space-y-0.5 pr-4">
        <div className="text-sm font-medium">Humor diário</div>
        <div className="text-xs text-muted-foreground">
          Mostrar registro de humor na tela inicial
        </div>
      </div>
      <Switch
        checked={isEnabled}
        onCheckedChange={handleToggle}
        disabled={isLoading}
      />
    </div>
  );
};
