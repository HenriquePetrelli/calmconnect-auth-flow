import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SupportGroup {
  id: string;
  nome: string;
  descricao: string;
  criado_em: string;
  is_favorited?: boolean;
}

export interface GroupTestimonial {
  id: string;
  group_id: string;
  user_id: string;
  anonimo: boolean;
  sintoma_id: string | null;
  humor: number;
  texto: string;
  criado_em: string;
  profiles?: {
    full_name: string;
  };
  transtornos_sintomas?: {
    sintomas: string[];
  };
}

export interface GroupSymptom {
  id: string;
  transtorno: string;
  sintomas: string[];
}

export const useSupportGroups = () => {
  const [groups, setGroups] = useState<SupportGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchGroups = async () => {
    try {
      setLoading(true);
      
      const { data: groupsData, error: groupsError } = await supabase
        .from('support_groups')
        .select('*')
        .order('nome');

      if (groupsError) throw groupsError;

      // Fetch user's favorites
      const { data: favoritesData } = await supabase
        .from('group_favorites')
        .select('group_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

      const favoriteIds = favoritesData?.map(fav => fav.group_id) || [];

      const groupsWithFavorites = groupsData.map(group => ({
        ...group,
        is_favorited: favoriteIds.includes(group.id)
      }));

      // Sort: favorites first, then alphabetically
      groupsWithFavorites.sort((a, b) => {
        if (a.is_favorited && !b.is_favorited) return -1;
        if (!a.is_favorited && b.is_favorited) return 1;
        return a.nome.localeCompare(b.nome);
      });

      setGroups(groupsWithFavorites);
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os grupos de apoio",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (groupId: string) => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;

      const group = groups.find(g => g.id === groupId);
      if (!group) return;

      if (group.is_favorited) {
        // Remove from favorites
        const { error } = await supabase
          .from('group_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('group_id', groupId);

        if (error) throw error;
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('group_favorites')
          .insert({
            user_id: user.id,
            group_id: groupId
          });

        if (error) throw error;
      }

      // Update local state
      setGroups(prev => {
        const updated = prev.map(g => 
          g.id === groupId 
            ? { ...g, is_favorited: !g.is_favorited }
            : g
        );

        // Re-sort after toggling
        return updated.sort((a, b) => {
          if (a.is_favorited && !b.is_favorited) return -1;
          if (!a.is_favorited && b.is_favorited) return 1;
          return a.nome.localeCompare(b.nome);
        });
      });

      toast({
        title: group.is_favorited ? "Removido dos favoritos" : "Adicionado aos favoritos",
        description: `${group.nome} foi ${group.is_favorited ? 'removido dos' : 'adicionado aos'} seus favoritos`,
      });
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar os favoritos",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  return {
    groups,
    loading,
    toggleFavorite,
    refetch: fetchGroups
  };
};

export const useGroupTestimonials = (groupId: string) => {
  const [testimonials, setTestimonials] = useState<GroupTestimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTestimonials = async () => {
    if (!groupId) return;
    
    try {
      setLoading(true);
      
      // Fetch testimonials without profiles relation for now
      const { data, error } = await supabase
        .from('group_testimonials')
        .select(`
          *,
          transtornos_sintomas(sintomas)
        `)
        .eq('group_id', groupId)
        .order('criado_em', { ascending: false });

      if (error) throw error;

      // For each testimonial, fetch the user profile separately
      const testimonialsWithProfiles = await Promise.all(
        (data || []).map(async (testimonial) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', testimonial.user_id)
            .single();

          return {
            ...testimonial,
            profiles: profile
          };
        })
      );

      setTestimonials(testimonialsWithProfiles);
    } catch (error) {
      console.error('Error fetching testimonials:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os depoimentos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addTestimonial = async (testimonial: {
    anonimo: boolean;
    sintoma_id: string | null;
    humor: number;
    texto: string;
  }) => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('group_testimonials')
        .insert({
          group_id: groupId,
          user_id: user.id,
          ...testimonial
        });

      if (error) throw error;

      toast({
        title: "Depoimento adicionado",
        description: "Seu depoimento foi compartilhado com sucesso!",
      });

      fetchTestimonials(); // Refresh list
      return true;
    } catch (error) {
      console.error('Error adding testimonial:', error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o depoimento",
        variant: "destructive"
      });
      return false;
    }
  };

  useEffect(() => {
    fetchTestimonials();
  }, [groupId]);

  return {
    testimonials,
    loading,
    addTestimonial,
    refetch: fetchTestimonials
  };
};

export const useGroupSymptoms = (groupName: string) => {
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [symptomId, setSymptomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSymptoms = async () => {
      if (!groupName) return;
      
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('transtornos_sintomas')
          .select('*')
          .eq('transtorno', groupName)
          .single();

        if (error) {
          console.warn('No symptoms found for group:', groupName);
          setSymptoms([]);
          setSymptomId(null);
        } else {
          setSymptoms(data.sintomas || []);
          setSymptomId(data.id);
        }
      } catch (error) {
        console.error('Error fetching symptoms:', error);
        setSymptoms([]);
        setSymptomId(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSymptoms();
  }, [groupName]);

  return { symptoms, symptomId, loading };
};