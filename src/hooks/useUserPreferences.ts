import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface UserPreferences {
  mic_device_id?: string | null;
  camera_device_id?: string | null;
  speaker_device_id?: string | null;
  background_blur?: boolean;
}

export const useUserPreferences = () => {
  const [preferences, setPreferences] = useState<UserPreferences>({
    mic_device_id: null,
    camera_device_id: null,
    speaker_device_id: null,
    background_blur: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setPreferences({
          mic_device_id: data.mic_device_id,
          camera_device_id: data.camera_device_id,
          speaker_device_id: data.speaker_device_id,
          background_blur: data.background_blur || false,
        });
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const savePreferences = async (newPreferences: Partial<UserPreferences>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const updatedPreferences = { ...preferences, ...newPreferences };
      
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          mic_device_id: updatedPreferences.mic_device_id,
          camera_device_id: updatedPreferences.camera_device_id,
          speaker_device_id: updatedPreferences.speaker_device_id,
          background_blur: updatedPreferences.background_blur,
        });

      if (error) throw error;

      setPreferences(updatedPreferences);
      
      return true;
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao salvar preferências',
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    preferences,
    isLoading,
    savePreferences,
    loadPreferences,
  };
};