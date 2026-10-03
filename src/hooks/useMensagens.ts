import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Mensagem {
  id: string;
  conversa_id: string;
  autor_id: string;
  conteudo?: string;
  tipo: 'texto' | 'imagem';
  imagem_url?: string;
  lida_em: string | null;
  created_at: string;
  updated_at: string;
  // Dados do autor
  autor?: {
    full_name: string;
    user_type: string;
  };
}

export const useMensagens = (conversaId?: string) => {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [loading, setLoading] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchMensagens = async () => {
    if (!conversaId) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('mensagens')
        .select('*')
        .eq('conversa_id', conversaId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMensagens((data ?? []) as Mensagem[]);
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar mensagens',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  /** Marks every message from the other participant as read by the current user. */
  const marcarComoLidas = async () => {
    if (!conversaId || !user) return;

    try {
      const { error } = await supabase.rpc('marcar_mensagens_como_lidas', { p_conversa_id: conversaId });
      if (error) throw error;
    } catch (error) {
      console.error('Erro ao marcar mensagens como lidas:', error);
    }
  };

  const enviarMensagem = async (conteudo: string, tipo: 'texto' | 'imagem' = 'texto', imagemUrl?: string) => {
    if (!user || !conversaId) return false;

    try {
      setEnviando(true);

      const { data: inserida, error } = await supabase
        .from('mensagens')
        .insert({
          conversa_id: conversaId,
          autor_id: user.id,
          conteudo: tipo === 'texto' ? conteudo : null,
          tipo,
          imagem_url: imagemUrl
        })
        .select()
        .single();

      if (error) throw error;
      // Aparece na hora (sem esperar o tempo real).
      if (inserida) {
        setMensagens((prev) => (prev.some((m) => m.id === inserida.id) ? prev : [...prev, inserida as Mensagem]));
      }

      // Atualizar updated_at da conversa
      await supabase
        .from('conversas')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversaId);

      return true;
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao enviar mensagem',
        variant: 'destructive',
      });
      return false;
    } finally {
      setEnviando(false);
    }
  };

  /**
   * Envia a imagem para o bucket privado e devolve o caminho (não um link
   * público: o bucket é privado, e o link público não abria — a imagem
   * aparecia quebrada para os dois lados). A tela gera um link temporário.
   */
  const uploadImagem = async (file: File): Promise<string | null> => {
    try {
      const fileExt = (file.type.split('/')[1] || file.name.split('.').pop() || 'jpg').replace(/[^a-z0-9]/gi, '').slice(0, 5);
      const filePath = `chat-images/${user?.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, { contentType: file.type });

      if (uploadError) throw uploadError;

      return filePath;
    } catch (error) {
      console.error('Erro ao fazer upload da imagem:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao fazer upload da imagem',
        variant: 'destructive',
      });
      return null;
    }
  };

  useEffect(() => {
    if (conversaId) {
      fetchMensagens().then(marcarComoLidas);
    }
  }, [conversaId]);

  // Tempo real: nova mensagem entra no fim da lista; leitura (lida_em) só
  // atualiza a mensagem. Antes cada evento recarregava a conversa inteira.
  useEffect(() => {
    if (!conversaId) return;

    const channel = supabase
      .channel(`mensagens-${conversaId}-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensagens', filter: `conversa_id=eq.${conversaId}` },
        (payload) => {
          const nova = payload.new as Mensagem;
          setMensagens((prev) => (prev.some((m) => m.id === nova.id) ? prev : [...prev, nova]));
          if (nova.autor_id !== user?.id) marcarComoLidas();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'mensagens', filter: `conversa_id=eq.${conversaId}` },
        (payload) => {
          const atualizada = payload.new as Mensagem;
          setMensagens((prev) => prev.map((m) => (m.id === atualizada.id ? { ...m, ...atualizada } : m)));
        }
      )
      .subscribe();

    // O realtime não reenvia o que chegou com o socket caído (tela apagada,
    // troca de rede): ao voltar, busca o que faltou sem recarregar a tela.
    const sincronizar = async () => {
      if (document.visibilityState !== 'visible') return;
      const { data } = await supabase
        .from('mensagens')
        .select('*')
        .eq('conversa_id', conversaId)
        .order('created_at', { ascending: true });
      if (!data) return;
      setMensagens((prev) => {
        const novas = (data as Mensagem[]).filter((m) => !prev.some((p) => p.id === m.id));
        const porId = new Map((data as Mensagem[]).map((m) => [m.id, m]));
        const atualizadas = prev.map((m) => porId.get(m.id) ?? m);
        return novas.length ? [...atualizadas, ...novas] : atualizadas;
      });
      marcarComoLidas();
    };
    window.addEventListener('online', sincronizar);
    document.addEventListener('visibilitychange', sincronizar);

    return () => {
      window.removeEventListener('online', sincronizar);
      document.removeEventListener('visibilitychange', sincronizar);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversaId, user?.id]);

  return {
    mensagens,
    loading,
    enviando,
    enviarMensagem,
    uploadImagem,
    refetch: fetchMensagens
  };
};