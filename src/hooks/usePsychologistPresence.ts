import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const usePsychologistPresence = () => {
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let userId: string | undefined;

    const fetchStatus = async () => {
      const { data: auth } = await supabase.auth.getUser();
      userId = auth.user?.id;
      if (!userId) {
        setInitialized(true);
        return;
      }

      const { data } = await supabase
        .from('psychologist_presence')
        .select('psychologist_id')
        .eq('psychologist_id', userId)
        .maybeSingle();

      setIsOnline(!!data);
      setInitialized(true);
    };

    fetchStatus();

    const channel = supabase
      .channel(`psychologist_presence_shared_${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'psychologist_presence' },
        (payload) => {
          if (!userId) return;
          const newRow: any = payload.new;
          const oldRow: any = payload.old;
          if (payload.eventType === 'DELETE') {
            if (oldRow?.psychologist_id === userId) setIsOnline(false);
          } else if (newRow?.psychologist_id === userId) {
            setIsOnline(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const setOnlineStatus = useCallback(async (nextStatus: boolean) => {
    setLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error('Usuário não autenticado');

      if (nextStatus) {
        const { error } = await supabase
          .from('psychologist_presence')
          .upsert({
            psychologist_id: userId,
            last_online: new Date().toISOString(),
            emergency_accepted_count: 0,
            emergency_rejected_count: 0,
          });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('psychologist_presence')
          .delete()
          .eq('psychologist_id', userId);
        if (error) throw error;
      }

      setIsOnline(nextStatus);
      toast({
        title: 'Status atualizado',
        description: `Você está agora ${nextStatus ? 'online' : 'offline'}`,
      });
    } catch (err: any) {
      console.error('Error updating presence:', err);
      toast({
        title: 'Erro',
        description: `Não foi possível atualizar seu status: ${err.message}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const toggle = useCallback(() => setOnlineStatus(!isOnline), [isOnline, setOnlineStatus]);

  return { isOnline, loading, initialized, setOnlineStatus, toggle };
};
