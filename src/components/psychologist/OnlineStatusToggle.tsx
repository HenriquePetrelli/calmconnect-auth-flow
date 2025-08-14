import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

export const OnlineStatusToggle = () => {
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchStatus = async () => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) return;

      const { data, error } = await supabase
        .from('psychologist_presence')
        .select('is_online')
        .eq('psychologist_id', userId)
        .maybeSingle();

      if (!error && data) setIsOnline(data.is_online);
    };

    fetchStatus();

    // Set up real-time subscription for status changes
    const channel = supabase
      .channel('psychologist_presence_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'psychologist_presence'
        },
        async (payload) => {
          const { data: auth } = await supabase.auth.getUser();
          if (auth.user?.id && payload.new && 
              (payload.new as any).psychologist_id === auth.user.id) {
            setIsOnline((payload.new as any).is_online);
          } else if (payload.eventType === 'DELETE' && 
                    (payload.old as any).psychologist_id === auth.user?.id) {
            setIsOnline(false);
          }
        }
      )
      .subscribe();

    // Handle connection state changes
    const handleConnectionChange = async () => {
      if (navigator.onLine && isOnline) {
        const { data: auth } = await supabase.auth.getUser();
        const userId = auth.user?.id;
        if (userId) {
          await supabase
            .from('psychologist_presence')
            .upsert({
              psychologist_id: userId,
              is_online: true,
              last_online: new Date().toISOString(),
            });
        }
      }
    };

    window.addEventListener('online', handleConnectionChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('online', handleConnectionChange);
    };
  }, [isOnline]);

  const handleToggle = async () => {
    setLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error('Usuário não autenticado');

      const nextStatus = !isOnline;

      if (nextStatus) {
        // Insert/Update presence record when going online
        const { error } = await supabase
          .from('psychologist_presence')
          .upsert({
            psychologist_id: userId,
            is_online: true,
            last_online: new Date().toISOString(),
          });
        if (error) throw error;
      } else {
        // Delete presence record when going offline
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
      console.error('Error updating status:', err);
      toast({ 
        title: 'Erro', 
        description: 'Não foi possível atualizar seu status.', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3 p-4 border border-border rounded-lg bg-card">
      <div className="flex-1">
        <p className="font-medium text-foreground">Status de Disponibilidade</p>
        <p className="text-sm text-muted-foreground">
          {isOnline ? 'Visível para pacientes' : 'Não visível para pacientes'}
        </p>
      </div>
      <Switch
        checked={isOnline}
        onCheckedChange={handleToggle}
        disabled={loading}
      />
      <span className={`w-20 text-sm font-medium ${isOnline ? 'text-primary' : 'text-muted-foreground'}`}>
        {isOnline ? 'Online' : 'Offline'}
      </span>
    </div>
  );
};

export default OnlineStatusToggle;
