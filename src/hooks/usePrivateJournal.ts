import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getSessionUser } from '@/lib/currentUser';
import { useToast } from '@/hooks/use-toast';
import { fromZonedTime } from 'date-fns-tz';
import { getFriendlyErrorMessage } from '@/utils/errorMessage';

export const JOURNAL_DAILY_LIMIT = 2;
const LIMIT_MESSAGE = 'Limite diário de 2 anotações atingido. Tente novamente amanhã.';

const PATIENT_TIMEZONE = 'America/Sao_Paulo';

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
      const { data: { user } } = await getSessionUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Check daily limit (2 entries per day) — using the patient's local
      // (Brasília) calendar day, not UTC, so entries near local midnight
      // count against the right day.
      const localDateStr = new Date().toLocaleDateString('en-CA', { timeZone: PATIENT_TIMEZONE });
      const startOfLocalDay = fromZonedTime(`${localDateStr}T00:00:00`, PATIENT_TIMEZONE);
      const startOfNextLocalDay = new Date(startOfLocalDay.getTime() + 24 * 60 * 60 * 1000);
      const { data: todayEntries, error: countError } = await supabase
        .from('private_journals')
        .select('id')
        .eq('user_id', user.id)
        .gte('criado_em', startOfLocalDay.toISOString())
        .lt('criado_em', startOfNextLocalDay.toISOString());

      if (countError) throw countError;

      // Aviso antecipado; o banco confere de novo (gatilho enforce_journal_daily_limit).
      if (todayEntries && todayEntries.length >= JOURNAL_DAILY_LIMIT) {
        throw new Error(LIMIT_MESSAGE);
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
      toast({ title: 'Anotação criada' });

      return data;
    } catch (error) {
      // Um aviso só (antes o limite mostrava dois: o do limite e um genérico).
      console.error('Erro ao criar entrada:', error);
      const message = getFriendlyErrorMessage(error, 'Não foi possível criar a anotação.');
      toast({
        title: message === LIMIT_MESSAGE ? 'Limite diário atingido' : 'Não foi possível salvar',
        description: message,
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

      toast({ title: 'Anotação atualizada' });

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
      toast({ title: 'Anotação excluída' });
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