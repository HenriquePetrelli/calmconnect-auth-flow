import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Conversa {
  id: string;
  paciente_id: string;
  psicologo_id: string;
  data_inicio: string;
  data_fim?: string;
  status: 'ativa' | 'somente_leitura' | 'expirada';
  created_at: string;
  updated_at: string;
  // Dados do psicólogo ou paciente (dependendo do tipo de usuário)
  outro_usuario?: {
    full_name: string;
    user_type: string;
  };
  ultima_mensagem?: {
    conteudo: string;
    created_at: string;
    tipo: string;
  };
}

export interface PsicologoDisponivel {
  id: string;
  user_id: string;
  full_name: string;
  specialization: string;
  ultima_consulta: string;
}

export const useConversas = () => {
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [psicologosDisponiveis, setPsicologosDisponiveis] = useState<PsicologoDisponivel[]>([]);
  const [loading, setLoading] = useState(false);
  const { user, userType } = useAuth();
  const { toast } = useToast();

  const fetchConversas = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Buscar conversas do usuário
      const { data: conversasData, error: conversasError } = await supabase
        .from('conversas')
        .select('*')
        .order('updated_at', { ascending: false });

      if (conversasError) throw conversasError;

      // Para cada conversa, buscar dados do outro usuário
      const conversasComDados = await Promise.all(
        (conversasData || []).map(async (conversa) => {
          const outroUserId = userType === 'patient' ? conversa.psicologo_id : conversa.paciente_id;
          
          const { data: outroUsuario } = await supabase
            .from('profiles')
            .select('full_name, user_type')
            .eq('user_id', outroUserId)
            .single();

          // Buscar última mensagem
          const { data: ultimaMensagem } = await supabase
            .from('mensagens')
            .select('conteudo, created_at, tipo')
            .eq('conversa_id', conversa.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          return {
            ...conversa,
            outro_usuario: outroUsuario || undefined,
            ultima_mensagem: ultimaMensagem || undefined
          } as Conversa;
        })
      );

      setConversas(conversasComDados);
    } catch (error) {
      console.error('Erro ao buscar conversas:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar conversas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPsicologosDisponiveis = async () => {
    if (!user || userType !== 'patient') return;

    try {
      // Buscar psicólogos com consultas finalizadas nos últimos 30 dias
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
          psychologist_id,
          scheduled_at,
          psychologists!inner(
            id,
            user_id,
            full_name,
            specialization
          )
        `)
        .eq('patient_id', user.id)
        .eq('status', 'completed')
        .gte('scheduled_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('scheduled_at', { ascending: false });

      if (error) throw error;

      // Filtrar psicólogos únicos e verificar se já existe conversa
      const psicologosUnicos = appointments?.reduce((acc: PsicologoDisponivel[], curr) => {
        const psicologo = curr.psychologists;
        const exists = acc.find(p => p.user_id === psicologo.user_id);
        
        if (!exists) {
          acc.push({
            id: psicologo.id,
            user_id: psicologo.user_id,
            full_name: psicologo.full_name,
            specialization: psicologo.specialization,
            ultima_consulta: curr.scheduled_at
          });
        }
        
        return acc;
      }, []) || [];

      // Filtrar apenas psicólogos que não têm conversa ativa
      const conversasExistentes = conversas.map(c => c.psicologo_id);
      const psicologosDisponiveis = psicologosUnicos.filter(
        p => !conversasExistentes.includes(p.user_id)
      );

      setPsicologosDisponiveis(psicologosDisponiveis);
    } catch (error) {
      console.error('Erro ao buscar psicólogos disponíveis:', error);
    }
  };

  const criarConversa = async (psicologoId: string) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('conversas')
        .insert({
          paciente_id: user.id,
          psicologo_id: psicologoId,
          status: 'ativa'
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Nova conversa criada com sucesso!',
      });

      await fetchConversas();
      return data;
    } catch (error) {
      console.error('Erro ao criar conversa:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao criar nova conversa',
        variant: 'destructive',
      });
      return null;
    }
  };

  const excluirConversa = async (conversaId: string) => {
    try {
      const { error } = await supabase
        .from('conversas')
        .delete()
        .eq('id', conversaId);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Conversa excluída com sucesso!',
      });

      await fetchConversas();
    } catch (error) {
      console.error('Erro ao excluir conversa:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao excluir conversa',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (user) {
      fetchConversas();
    }
  }, [user, userType]);

  useEffect(() => {
    if (user && userType === 'patient') {
      fetchPsicologosDisponiveis();
    }
  }, [user, userType, conversas]);

  // Configurar realtime para conversas
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('conversas-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversas',
          filter: userType === 'patient' 
            ? `paciente_id=eq.${user.id}` 
            : `psicologo_id=eq.${user.id}`
        },
        () => {
          fetchConversas();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, userType]);

  return {
    conversas,
    psicologosDisponiveis,
    loading,
    criarConversa,
    excluirConversa,
    refetch: fetchConversas
  };
};