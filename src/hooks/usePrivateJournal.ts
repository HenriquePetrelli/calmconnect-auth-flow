import { useState, useEffect } from 'react';
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
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchEntries = async (moodFilter?: number) => {
    try {
      setLoading(true);
      let query = supabase
        .from('private_journals')
        .select('*')
        .order('criado_em', { ascending: false });

      if (moodFilter !== undefined) {
        query = query.eq('humor', moodFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      setEntries(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar entradas",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addEntry = async (texto: string, humor: number): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('private_journals')
        .insert({
          user_id: user.id,
          texto,
          humor
        });

      if (error) throw error;

      toast({
        title: "Entrada criada",
        description: "Sua entrada foi salva no diário.",
      });

      fetchEntries(); // Reload entries
      return true;
    } catch (error: any) {
      toast({
        title: "Erro ao criar entrada",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };

  const updateEntry = async (id: string, texto: string, humor: number): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('private_journals')
        .update({ texto, humor })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Entrada atualizada",
        description: "Sua entrada foi atualizada com sucesso.",
      });

      fetchEntries(); // Reload entries
      return true;
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar entrada",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteEntry = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('private_journals')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Entrada excluída",
        description: "Sua entrada foi removida do diário.",
      });

      fetchEntries(); // Reload entries
      return true;
    } catch (error: any) {
      toast({
        title: "Erro ao excluir entrada",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  return {
    entries,
    loading,
    fetchEntries,
    addEntry,
    updateEntry,
    deleteEntry
  };
};