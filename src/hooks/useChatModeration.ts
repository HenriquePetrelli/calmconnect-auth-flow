import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ChatUsageMetrics {
  total_conversas: number;
  ativas: number;
  somente_leitura: number;
  expiradas: number;
  conversas_novas: number;
  total_mensagens: number;
  mensagens_texto: number;
  mensagens_imagem: number;
  avg_mensagens_por_conversa_ativa: number;
}

export interface AdminConversaOverview {
  conversa_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  paciente_nome: string | null;
  psicologo_nome: string | null;
  mensagens_count: number;
  last_message_at: string | null;
  last_message_tipo: string | null;
}

/** Admin-only chat oversight: aggregated usage metrics and per-conversation
 * metadata. Message content is never fetched — both RPCs are metadata-only
 * by design, so this hook cannot leak conversa content even by accident. */
export const useChatModeration = () => {
  const [metrics, setMetrics] = useState<ChatUsageMetrics | null>(null);
  const [conversas, setConversas] = useState<AdminConversaOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: metricsData }, { data: conversasData, error: conversasError }] = await Promise.all([
        supabase.rpc('get_chat_usage_metrics', { p_days: 30 }),
        supabase.rpc('get_admin_conversas_overview'),
      ]);

      if (conversasError) throw conversasError;

      setMetrics((metricsData as unknown as ChatUsageMetrics) ?? null);
      setConversas(conversasData ?? []);
    } catch (error) {
      console.error('Erro ao carregar dados de moderação do chat:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar dados de uso do chat',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const arquivarConversa = async (conversaId: string) => {
    setArchivingId(conversaId);
    try {
      const { error } = await supabase.rpc('admin_archive_conversa', { p_conversa_id: conversaId });
      if (error) throw error;

      toast({ title: 'Conversa arquivada', description: 'A conversa foi encerrada.' });
      await load();
      return true;
    } catch (error) {
      console.error('Erro ao arquivar conversa:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível arquivar a conversa',
        variant: 'destructive',
      });
      return false;
    } finally {
      setArchivingId(null);
    }
  };

  return { metrics, conversas, loading, archivingId, arquivarConversa, reload: load };
};
