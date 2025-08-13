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
  }, []);

  const handleToggle = async () => {
    setLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error('Usuário não autenticado');

      const next = !isOnline;
      let opError: any = null;

      if (next) {
        const { error: upsertError } = await supabase
          .from('psychologist_presence')
          .upsert({
            psychologist_id: userId,
            is_online: true,
            last_online: new Date().toISOString(),
          });
        opError = upsertError;
      } else {
        const { error: deleteError } = await supabase
          .from('psychologist_presence')
          .delete()
          .eq('psychologist_id', userId);
        opError = deleteError;
      }

      if (opError) throw opError;

      setIsOnline(next);
      toast({
        title: 'Status atualizado',
        description: `Você está agora ${next ? 'online' : 'offline'}`,
      });
    } catch (err: any) {
      toast({ title: 'Erro', description: 'Não foi possível atualizar seu status.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Switch checked={isOnline} onCheckedChange={handleToggle} disabled={loading} />
      <span className="text-sm">{isOnline ? 'Online' : 'Offline'}</span>
    </div>
  );
};

export default OnlineStatusToggle;
