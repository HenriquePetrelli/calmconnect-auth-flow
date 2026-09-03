import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/contexts/SubscriptionContext';

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
  sintoma_texto: string | null;
  humor: number;
  texto: string;
  criado_em: string;
  likes_positivos: number;
  likes_negativos: number;
  profiles?: {
    full_name: string;
  };
  user_like?: {
    tipo: 'positivo' | 'negativo';
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

export const useGroupTestimonials = (groupId: string, filterByUser: boolean = false) => {
  const [testimonials, setTestimonials] = useState<GroupTestimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { subscribed, subscriptionTier } = useSubscription();

  const fetchTestimonials = async (userFilter: boolean = filterByUser) => {
    if (!groupId) return;
    
    try {
      setLoading(true);
      const { data: user } = await supabase.auth.getUser();
      
      // Build query with optional user filter
      let query = supabase
        .from('group_testimonials')
        .select('*')
        .eq('group_id', groupId);

      // Apply user filter if requested
      if (userFilter && user.user) {
        query = query.eq('user_id', user.user.id);
      }

      const { data, error } = await query.order('criado_em', { ascending: false });

      if (error) throw error;

      // For each testimonial, fetch user profile and user like status
      const testimonialsWithProfiles = await Promise.all(
        (data || []).map(async (testimonial) => {
          // Fetch profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', testimonial.user_id)
            .single();

          // Fetch user's like on this testimonial
          let userLike = null;
          if (user.user) {
            const { data: likeData } = await supabase
              .from('group_testimonial_likes')
              .select('tipo')
              .eq('testimonial_id', testimonial.id)
              .eq('user_id', user.user.id)
              .maybeSingle(); // Use maybeSingle to avoid errors when no like exists
            
            userLike = likeData;
          }

          return {
            ...testimonial,
            profiles: profile,
            user_like: userLike
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
    sintoma_texto: string | null;
    humor: number;
    texto: string;
  }) => {
    try {
      // Check subscription for premium features
      if (!subscribed || (subscriptionTier !== 'Plus' && subscriptionTier !== 'Premium')) {
        toast({
          title: 'Funcionalidade Premium',
          description: 'Essa funcionalidade está disponível apenas para usuários Premium ou Plus.',
          variant: 'destructive',
        });
        return false;
      }

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

  const updateTestimonial = async (testimonialId: string, updates: {
    anonimo: boolean;
    sintoma_id: string | null;
    sintoma_texto: string | null;
    humor: number;
    texto: string;
  }) => {
    try {
      const { error } = await supabase
        .from('group_testimonials')
        .update(updates)
        .eq('id', testimonialId);

      if (error) throw error;

      toast({
        title: "Depoimento atualizado",
        description: "Suas alterações foram salvas com sucesso!",
      });

      await fetchTestimonials(filterByUser); // Refresh list
      return true;
    } catch (error) {
      console.error('Error updating testimonial:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o depoimento",
        variant: "destructive"
      });
      return false;
    }
  };

  const deleteTestimonial = async (testimonialId: string) => {
    try {
      const { error } = await supabase
        .from('group_testimonials')
        .delete()
        .eq('id', testimonialId);

      if (error) throw error;

      toast({
        title: "Depoimento excluído",
        description: "Seu depoimento foi removido com sucesso!",
      });

      await fetchTestimonials(filterByUser); // Refresh list
      return true;
    } catch (error) {
      console.error('Error deleting testimonial:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o depoimento",
        variant: "destructive"
      });
      return false;
    }
  };

  useEffect(() => {
    fetchTestimonials();
  }, [groupId, filterByUser]); // Remove real-time subscription complexity for now

  const likeTestimonial = async (testimonialId: string, tipo: 'positivo' | 'negativo' | 'none') => {
    try {
      // Check subscription for premium features
      if (!subscribed || (subscriptionTier !== 'Plus' && subscriptionTier !== 'Premium')) {
        toast({
          title: 'Funcionalidade Premium',
          description: 'Essa funcionalidade está disponível apenas para usuários Premium ou Plus.',
          variant: 'destructive',
        });
        return false;
      }

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return false;

      // Optimistic update - update UI immediately for better UX
      setTestimonials(prev => {
        return prev.map(testimonial => {
          if (testimonial.id === testimonialId) {
            const currentLike = testimonial.user_like?.tipo as ('positivo' | 'negativo' | undefined);
            
            // If user is clearing the reaction
            if (tipo === 'none') {
              if (!currentLike) return testimonial; // nothing to clear
              return {
                ...testimonial,
                user_like: null,
                likes_positivos: currentLike === 'positivo' ? Math.max(0, testimonial.likes_positivos - 1) : testimonial.likes_positivos,
                likes_negativos: currentLike === 'negativo' ? Math.max(0, testimonial.likes_negativos - 1) : testimonial.likes_negativos,
              };
            }

            // Otherwise user is setting a reaction
            let newLike: { tipo: 'positivo' | 'negativo' } | null = { tipo } as { tipo: 'positivo' | 'negativo' };
            let newPositives = testimonial.likes_positivos;
            let newNegatives = testimonial.likes_negativos;

            if (currentLike === tipo) {
              // Same type clicked -> toggle off
              newLike = null;
              if (tipo === 'positivo') newPositives = Math.max(0, newPositives - 1);
              else newNegatives = Math.max(0, newNegatives - 1);
            } else if (currentLike) {
              // Switch reaction
              if (currentLike === 'positivo') {
                newPositives = Math.max(0, newPositives - 1);
                newNegatives = newNegatives + 1;
              } else {
                newNegatives = Math.max(0, newNegatives - 1);
                newPositives = newPositives + 1;
              }
            } else {
              // Add new reaction
              if (tipo === 'positivo') newPositives = newPositives + 1; else newNegatives = newNegatives + 1;
            }

            return {
              ...testimonial,
              user_like: newLike,
              likes_positivos: newPositives,
              likes_negativos: newNegatives
            };
          }
          return testimonial;
        });
      });

      // Check if user already liked this testimonial
      const { data: existingLike } = await supabase
        .from('group_testimonial_likes')
        .select('*')
        .eq('testimonial_id', testimonialId)
        .eq('user_id', user.user.id)
        .maybeSingle();

      // If user is clearing reaction
      if (tipo === 'none') {
        if (existingLike) {
          const { error } = await supabase
            .from('group_testimonial_likes')
            .delete()
            .eq('id', existingLike.id);
          if (error) throw error;
          toast({ title: 'Reação removida', description: 'Sua avaliação foi removida' });
        }
        return true;
      }

      // From here on, tipo is 'positivo' | 'negativo'
      const targetTipo: 'positivo' | 'negativo' = tipo === 'positivo' ? 'positivo' : 'negativo';

      if (existingLike) {
        if (existingLike.tipo === targetTipo) {
          // No change needed
          return true;
        }
        // Switch reaction
        const { error } = await supabase
          .from('group_testimonial_likes')
          .update({ tipo: targetTipo })
          .eq('id', existingLike.id);
        if (error) throw error;
        toast({ title: 'Reação alterada', description: `Sua avaliação foi alterada para ${targetTipo === 'positivo' ? 'curtir' : 'não curtir'}` });
      } else {
        // Create new like
        const { error } = await supabase
          .from('group_testimonial_likes')
          .insert({
            testimonial_id: testimonialId,
            user_id: user.user.id,
            tipo: targetTipo,
          });
        if (error) throw error;
        toast({ title: 'Reação adicionada', description: `Você ${targetTipo === 'positivo' ? 'curtiu' : 'não curtiu'} este depoimento` });
      }

      return true;
    } catch (error) {
      console.error('Error liking testimonial:', error);
      
      // Revert optimistic update on error by fetching fresh data
      await fetchTestimonials(filterByUser);
      
      toast({
        title: "Erro",
        description: "Não foi possível processar sua avaliação",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    testimonials,
    loading,
    addTestimonial,
    updateTestimonial,
    deleteTestimonial,
    likeTestimonial,
    refetch: (userFilter: boolean = filterByUser) => fetchTestimonials(userFilter)
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