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

      // Buscar dados do autor para cada mensagem
      const mensagensComAutor = await Promise.all(
        (data || []).map(async (msg) => {
          const { data: autor } = await supabase
            .from('profiles')
            .select('full_name, user_type')
            .eq('user_id', msg.autor_id)
            .single();

          return {
            ...msg,
            autor: autor || undefined
          } as Mensagem;
        })
      );

      setMensagens(mensagensComAutor);
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

      const { error } = await supabase
        .from('mensagens')
        .insert({
          conversa_id: conversaId,
          autor_id: user.id,
          conteudo: tipo === 'texto' ? conteudo : null,
          tipo,
          imagem_url: imagemUrl
        });

      if (error) throw error;

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

  const uploadImagem = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
      const filePath = `chat-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      return publicUrl;
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

  // Configurar realtime para mensagens (INSERT de novas mensagens e UPDATE de recibos de leitura)
  useEffect(() => {
    if (!conversaId) return;

    const channel = supabase
      .channel(`mensagens-${conversaId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mensagens',
          filter: `conversa_id=eq.${conversaId}`
        },
        () => {
          fetchMensagens().then(marcarComoLidas);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversaId]);

  return {
    mensagens,
    loading,
    enviando,
    enviarMensagem,
    uploadImagem,
    refetch: fetchMensagens
  };
};