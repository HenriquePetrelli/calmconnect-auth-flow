import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Mensagem {
  id: string;
  conversa_id: string;
  autor_id: string;
  conteudo?: string | null;
  tipo: 'texto' | 'imagem';
  imagem_url?: string | null;
  lida_em: string | null;
  created_at: string;
  updated_at: string;
  /** Só nas mensagens ainda não confirmadas pelo servidor. */
  envio?: 'enviando' | 'erro';
  /** Motivo de uma recusa do banco (conversa somente leitura, muitas seguidas). */
  erro?: string | null;
  /** Foto ainda não enviada: prévia local (só nesta aba). */
  previa?: string | null;
}

/** Mensagem pendente como fica guardada no aparelho (sem a foto em si). */
type Pendente = Mensagem & { arquivo?: File | null };

const chavePendentes = (conversaId: string) => `chat:pendentes:${conversaId}`;

const lerPendentes = (conversaId: string): Pendente[] => {
  try {
    const salvo = JSON.parse(localStorage.getItem(chavePendentes(conversaId)) ?? '[]') as Pendente[];
    // Ao reabrir, nada está "enviando": vira "não enviada" e reenvia sozinho.
    return salvo.map((p) => ({ ...p, envio: 'erro' as const, previa: null }));
  } catch {
    return [];
  }
};

const salvarPendentes = (conversaId: string, pendentes: Pendente[]) => {
  try {
    // Foto que ainda nem subiu não sobrevive a recarregar (o arquivo fica só na memória).
    const guardaveis = pendentes
      .filter((p) => p.tipo === 'texto' || p.imagem_url)
      .map(({ arquivo: _arquivo, previa: _previa, ...resto }) => resto);
    if (guardaveis.length) localStorage.setItem(chavePendentes(conversaId), JSON.stringify(guardaveis));
    else localStorage.removeItem(chavePendentes(conversaId));
  } catch {
    /* armazenamento indisponível (modo privado): segue só na memória */
  }
};

const novoId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      });

const telaVisivel = () => typeof document === 'undefined' || document.visibilityState === 'visible';

/**
 * Mensagens de uma conversa, no padrão dos apps de mensagem:
 * - a mensagem aparece na hora ("enviando") e vira enviada quando o banco confirma;
 * - o id é gerado no aparelho, então reenviar (rede caiu no meio) nunca duplica;
 * - sem internet, fica "não enviada", guardada no aparelho, e sai sozinha quando a rede volta;
 * - só marca como lida o que a pessoa pode estar vendo (tela visível).
 */
export const useMensagens = (conversaId?: string) => {
  const [confirmadas, setConfirmadas] = useState<Mensagem[]>([]);
  const [pendentes, setPendentes] = useState<Pendente[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const pendentesRef = useRef<Pendente[]>([]);
  const emEnvioRef = useRef<Set<string>>(new Set());
  /** Envios um de cada vez, na ordem em que foram escritos (como nos apps de mensagem). */
  const filaRef = useRef<Promise<unknown>>(Promise.resolve());

  const atualizarPendentes = useCallback(
    (mudar: (atual: Pendente[]) => Pendente[]) => {
      setPendentes((atual) => {
        const proximo = mudar(atual);
        pendentesRef.current = proximo;
        if (conversaId) salvarPendentes(conversaId, proximo);
        return proximo;
      });
    },
    [conversaId],
  );

  const juntarConfirmadas = useCallback((novas: Mensagem[]) => {
    setConfirmadas((atual) => {
      const porId = new Map(atual.map((m) => [m.id, m]));
      for (const m of novas) porId.set(m.id, { ...porId.get(m.id), ...m });
      return [...porId.values()].sort((a, b) => a.created_at.localeCompare(b.created_at));
    });
    // O que o servidor já tem deixa de ser pendente.
    const ids = new Set(novas.map((m) => m.id));
    if (pendentesRef.current.some((p) => ids.has(p.id))) {
      atualizarPendentes((atual) => atual.filter((p) => !ids.has(p.id)));
    }
  }, [atualizarPendentes]);

  const marcarComoLidas = useCallback(async () => {
    if (!conversaId || !user || !telaVisivel()) return;
    const { error } = await supabase.rpc('marcar_mensagens_como_lidas', { p_conversa_id: conversaId });
    if (error) console.error('Erro ao marcar mensagens como lidas:', error);
  }, [conversaId, user]);

  const buscar = useCallback(async () => {
    if (!conversaId) return false;
    const { data, error } = await supabase
      .from('mensagens')
      .select('*')
      .eq('conversa_id', conversaId)
      .order('created_at', { ascending: true });
    if (error || !data) return false;
    juntarConfirmadas(data as Mensagem[]);
    return true;
  }, [conversaId, juntarConfirmadas]);

  /** Envia (ou reenvia) uma pendente. Seguro para chamar várias vezes. */
  const enviarAgora = useCallback(
    async (id: string) => {
      if (!conversaId || !user || emEnvioRef.current.has(id)) return;
      const pendente = pendentesRef.current.find((p) => p.id === id);
      if (!pendente) return;
      emEnvioRef.current.add(id);
      atualizarPendentes((atual) => atual.map((p) => (p.id === id ? { ...p, envio: 'enviando', erro: null } : p)));

      try {
        let caminho = pendente.imagem_url ?? null;
        if (pendente.tipo === 'imagem' && !caminho) {
          if (!pendente.arquivo) throw new Error('A foto não está mais disponível. Escolha de novo.');
          const ext = (pendente.arquivo.type.split('/')[1] || 'jpg').replace(/[^a-z0-9]/gi, '').slice(0, 5);
          // Pasta da conversa: só os dois participantes enviam e veem (policy no banco).
          caminho = `chat-images/${conversaId}/${user.id}-${id}.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(caminho, pendente.arquivo, { contentType: pendente.arquivo.type });
          // "Já existe" = subiu numa tentativa anterior cuja resposta se perdeu.
          const jaExiste = /already exists|duplicate/i.test(uploadError?.message ?? '') || (uploadError as { statusCode?: string } | null)?.statusCode === '409';
          if (uploadError && !jaExiste) throw uploadError;
          // A foto já subiu: um reenvio não sobe de novo.
          atualizarPendentes((atual) => atual.map((p) => (p.id === id ? { ...p, imagem_url: caminho } : p)));
        }

        const { data, error } = await supabase
          .from('mensagens')
          .insert({
            id,
            conversa_id: conversaId,
            autor_id: user.id,
            conteudo: pendente.tipo === 'texto' ? pendente.conteudo : null,
            tipo: pendente.tipo,
            imagem_url: caminho,
          })
          .select()
          .single();

        if (error) {
          // Já tinha chegado (a resposta se perdeu no caminho): não duplica.
          if ((error as { code?: string }).code === '23505') {
            await buscar();
            atualizarPendentes((atual) => atual.filter((p) => p.id !== id));
            return;
          }
          throw error;
        }
        juntarConfirmadas([data as Mensagem]);
      } catch (error) {
        const codigo = (error as { code?: string })?.code;
        // Regra do banco (somente leitura, muitas mensagens seguidas): mostra o motivo.
        const motivo =
          codigo === 'P0001' || codigo === '42501'
            ? (error as { message?: string }).message ?? 'Mensagem recusada'
            : error instanceof Error && error.message.startsWith('A foto')
              ? error.message
              : null;
        atualizarPendentes((atual) => atual.map((p) => (p.id === id ? { ...p, envio: 'erro', erro: motivo } : p)));
        if (motivo) toast({ title: 'Mensagem não enviada', description: motivo, variant: 'destructive' });
      } finally {
        emEnvioRef.current.delete(id);
      }
    },
    [conversaId, user, atualizarPendentes, juntarConfirmadas, buscar, toast],
  );

  const tentarEnviar = useCallback(
    (id: string) => {
      const proximo = filaRef.current.then(() => enviarAgora(id)).catch(() => undefined);
      filaRef.current = proximo;
      return proximo;
    },
    [enviarAgora],
  );

  const criarPendente = useCallback(
    (parcial: Partial<Pendente> & Pick<Pendente, 'tipo'>) => {
      if (!conversaId || !user) return null;
      const agora = new Date().toISOString();
      const pendente: Pendente = {
        id: novoId(),
        conversa_id: conversaId,
        autor_id: user.id,
        conteudo: null,
        imagem_url: null,
        lida_em: null,
        created_at: agora,
        updated_at: agora,
        envio: 'enviando',
        ...parcial,
      };
      atualizarPendentes((atual) => [...atual, pendente]);
      pendentesRef.current = [...pendentesRef.current.filter((p) => p.id !== pendente.id), pendente];
      void tentarEnviar(pendente.id);
      return pendente.id;
    },
    [conversaId, user, atualizarPendentes, tentarEnviar],
  );

  const enviarTexto = useCallback(
    (texto: string) => {
      const conteudo = texto.trim();
      if (!conteudo) return false;
      return Boolean(criarPendente({ tipo: 'texto', conteudo }));
    },
    [criarPendente],
  );

  const enviarImagem = useCallback(
    (arquivo: File) => Boolean(criarPendente({ tipo: 'imagem', arquivo, previa: URL.createObjectURL(arquivo) })),
    [criarPendente],
  );

  const reenviar = useCallback((id: string) => void tentarEnviar(id), [tentarEnviar]);

  const descartar = useCallback(
    (id: string) => {
      const p = pendentesRef.current.find((x) => x.id === id);
      if (p?.previa) URL.revokeObjectURL(p.previa);
      atualizarPendentes((atual) => atual.filter((x) => x.id !== id));
    },
    [atualizarPendentes],
  );

  /** Reenvia tudo o que ficou para trás (rede voltou, tela voltou). */
  const reenviarPendentes = useCallback(() => {
    for (const p of pendentesRef.current) {
      // Recusa do banco (ex.: somente leitura) não adianta repetir sozinho.
      if (p.envio === 'erro' && !p.erro) void tentarEnviar(p.id);
    }
  }, [tentarEnviar]);

  // Carrega a conversa e o que ficou pendente no aparelho.
  useEffect(() => {
    if (!conversaId) return;
    setConfirmadas([]);
    const salvas = lerPendentes(conversaId);
    pendentesRef.current = salvas;
    setPendentes(salvas);
    let cancelado = false;
    setLoading(true);
    void (async () => {
      const ok = await buscar();
      if (cancelado) return;
      setLoading(false);
      if (!ok) {
        toast({ title: 'Erro', description: 'Erro ao carregar mensagens', variant: 'destructive' });
        return;
      }
      void marcarComoLidas();
      reenviarPendentes();
    })();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversaId]);

  // Tempo real + recuperação do que se perdeu com o socket caído.
  useEffect(() => {
    if (!conversaId) return;

    const sincronizar = async () => {
      await buscar();
      void marcarComoLidas();
      reenviarPendentes();
    };

    const channel = supabase
      .channel(`mensagens-${conversaId}-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensagens', filter: `conversa_id=eq.${conversaId}` },
        (payload) => {
          const nova = payload.new as Mensagem;
          juntarConfirmadas([nova]);
          if (nova.autor_id !== user?.id) void marcarComoLidas();
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'mensagens', filter: `conversa_id=eq.${conversaId}` },
        (payload) => juntarConfirmadas([payload.new as Mensagem]),
      )
      .subscribe((status) => {
        // Reconectou: busca o que chegou enquanto o socket estava caído.
        if (status === 'SUBSCRIBED') void sincronizar();
      });

    const aoVoltar = () => {
      if (telaVisivel()) void sincronizar();
    };
    window.addEventListener('online', aoVoltar);
    document.addEventListener('visibilitychange', aoVoltar);
    window.addEventListener('focus', aoVoltar);

    return () => {
      window.removeEventListener('online', aoVoltar);
      document.removeEventListener('visibilitychange', aoVoltar);
      window.removeEventListener('focus', aoVoltar);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversaId, user?.id]);

  const mensagens = useMemo(
    () => [...confirmadas, ...pendentes.filter((p) => !confirmadas.some((c) => c.id === p.id))],
    [confirmadas, pendentes],
  );

  return {
    mensagens,
    loading,
    enviarTexto,
    enviarImagem,
    reenviar,
    descartar,
    refetch: buscar,
  };
};
