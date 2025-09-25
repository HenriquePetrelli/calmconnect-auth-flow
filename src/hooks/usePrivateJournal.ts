import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface JournalEntry {
  id: string;
  user_id: string;
  texto: string;
  humor: number;
  criado_em: string;
  atualizado_em: string;
}

export const usePrivateJournal = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchEntries = useCallback(async (humorFilter?: number) => {
    setLoading(true);
    try {
      let query = supabase
        .from('private_journals')
        .select('*')
        .order('criado_em', { ascending: false });

      if (humorFilter !== undefined) {
        query = query.eq('humor', humorFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      setEntries(data || []);
    } catch (error) {
      console.error('Erro ao buscar entradas do diário:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as anotações do diário.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const createEntry = useCallback(async (texto: string, humor: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Check daily limit (2 entries per day)
      const today = new Date().toISOString().split('T')[0];
      const { data: todayEntries, error: countError } = await supabase
        .from('private_journals')
        .select('id')
        .eq('user_id', user.id)
        .gte('criado_em', `${today}T00:00:00.000Z`)
        .lt('criado_em', `${today}T23:59:59.999Z`);

      if (countError) throw countError;

      if (todayEntries && todayEntries.length >= 2) {
        toast({
          title: 'Limite diário atingido',
          description: 'Limite diário de 2 anotações atingido. Tente novamente amanhã.',
          variant: 'destructive',
        });
        throw new Error('Limite diário atingido');
      }

      const { data, error } = await supabase
        .from('private_journals')
        .insert({
          user_id: user.id,
          texto,
          humor,
        })
        .select()
        .single();

      if (error) throw error;

      setEntries(prev => [data, ...prev]);
      toast({
        title: 'Sucesso',
        description: 'Anotação criada com sucesso!',
      });

      return data;
    } catch (error) {
      console.error('Erro ao criar entrada:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar a anotação.',
        variant: 'destructive',
      });
      throw error;
    }
  }, [toast]);

  const updateEntry = useCallback(async (id: string, texto: string, humor: number) => {
    try {
      const { data, error } = await supabase
        .from('private_journals')
        .update({ texto, humor })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setEntries(prev => prev.map(entry => 
        entry.id === id ? data : entry
      ));

      toast({
        title: 'Sucesso',
        description: 'Anotação atualizada com sucesso!',
      });

      return data;
    } catch (error) {
      console.error('Erro ao atualizar entrada:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a anotação.',
        variant: 'destructive',
      });
      throw error;
    }
  }, [toast]);

  const deleteEntry = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('private_journals')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setEntries(prev => prev.filter(entry => entry.id !== id));
      toast({
        title: 'Sucesso',
        description: 'Anotação excluída com sucesso!',
      });
    } catch (error) {
      console.error('Erro ao excluir entrada:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a anotação.',
        variant: 'destructive',
      });
      throw error;
    }
  }, [toast]);

  return {
    entries,
    loading,
    fetchEntries,
    createEntry,
    updateEntry,
    deleteEntry,
  };
};