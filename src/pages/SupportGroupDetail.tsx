import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Info, Plus, User, ThumbsUp, ThumbsDown, Edit, Trash2, Filter, Crown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useGroupTestimonials, useGroupSymptoms } from '@/hooks/useSupportGroups';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import BottomNavigation from '@/components/BottomNavigation';
import BackButton from '@/components/BackButton';
import AddTestimonialForm from '@/components/support-groups/AddTestimonialForm';
import EditTestimonialForm from '@/components/support-groups/EditTestimonialForm';
import SubscriptionUpgradeModal from '@/components/SubscriptionUpgradeModal';
import { useSubscription } from '@/contexts/SubscriptionContext';

const moodEmojis = ['😞', '😔', '😐', '🙂', '😊', '😄'];
const moodLabels = ['Muito triste', 'Triste', 'Neutro', 'Bem', 'Feliz', 'Muito feliz'];

interface TestimonialCardProps {
  testimonial: {
    id: string;
    user_id: string;
    anonimo: boolean;
    sintoma_id: string | null;
    humor: number;
    texto: string;
    criado_em: string;
    likes_positivos: number;
    likes_negativos: number;
    profiles?: {
      full_name: string;
    };
    transtornos_sintomas?: {
      sintomas: string[];
    };
    user_like?: {
      tipo: 'positivo' | 'negativo';
    };
  };
  symptomName?: string;
  onLike: (testimonialId: string, tipo: 'positivo' | 'negativo' | 'none') => void;
  isPremiumUser?: boolean;
  onEdit: (testimonial: any) => void;
  onDelete: (testimonialId: string) => void;
  currentUserId?: string;
  groupName: string;
}

const TestimonialCard = ({ testimonial, symptomName, onLike, onEdit, onDelete, currentUserId, groupName, isPremiumUser = false }: TestimonialCardProps) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const userName = testimonial.anonimo 
    ? 'Anônimo' 
    : testimonial.profiles?.full_name || 'Usuário';

  const isOwnTestimonial = currentUserId === testimonial.user_id;
  const userLikeType = testimonial.user_like?.tipo;

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarFallback className="bg-primary/10 text-primary">
              {testimonial.anonimo ? (
                <User className="w-5 h-5" />
              ) : (
                userName.charAt(0).toUpperCase()
              )}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-foreground">
                {userName}
              </h4>
              {testimonial.anonimo && (
                <Badge variant="secondary" className="text-xs">
                  Anônimo
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>{formatDate(testimonial.criado_em)}</span>
              <div className="flex items-center gap-1">
                <span>{moodEmojis[testimonial.humor]}</span>
                <span>{moodLabels[testimonial.humor]}</span>
              </div>
            </div>
          </div>

          {/* Edit/Delete buttons for own testimonials */}
          {isOwnTestimonial && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(testimonial)}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              >
                <Edit className="w-4 h-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir depoimento</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja excluir este depoimento? Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDelete(testimonial.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
        
        {symptomName && (
          <div className="pt-2">
            <Badge variant="outline" className="text-xs">
              {symptomName}
            </Badge>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="pt-0 space-y-4">
        <p className="text-foreground leading-relaxed whitespace-pre-wrap">
          {testimonial.texto}
        </p>
        
        {/* Like/Dislike section - always visible */}
        <div className="pt-2 border-t border-border/50 space-y-3">
          {/* Like counts display */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ThumbsUp className="w-4 h-4" />
              <span className="text-sm font-medium">{testimonial.likes_positivos} curtidas</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <ThumbsDown className="w-4 h-4" />
              <span className="text-sm font-medium">{testimonial.likes_negativos} não curtidas</span>
            </div>
          </div>

          {/* Interactive like buttons for non-owners */}
          {!isOwnTestimonial && (
            <div className="flex items-center gap-3">
              <Button
                variant={userLikeType === 'positivo' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onLike(testimonial.id, userLikeType === 'positivo' ? 'none' : 'positivo')}
                disabled={!isPremiumUser}
                className={`flex items-center gap-2 h-9 px-4 transition-all ${
                  userLikeType === 'positivo' 
                    ? 'bg-green-600 hover:bg-green-700 text-white border-green-600' 
                    : 'text-muted-foreground hover:text-green-600 hover:border-green-600'
                } ${!isPremiumUser ? 'opacity-60' : ''}`}
              >
                <ThumbsUp className="w-4 h-4" />
                <span>{userLikeType === 'positivo' ? 'Curtido' : 'Curtir'}</span>
                {!isPremiumUser && <Crown className="w-3 h-3 ml-1" />}
              </Button>
              
              <Button
                variant={userLikeType === 'negativo' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onLike(testimonial.id, userLikeType === 'negativo' ? 'none' : 'negativo')}
                disabled={!isPremiumUser}
                className={`flex items-center gap-2 h-9 px-4 transition-all ${
                  userLikeType === 'negativo' 
                    ? 'bg-red-600 hover:bg-red-700 text-white border-red-600' 
                    : 'text-muted-foreground hover:text-red-600 hover:border-red-600'
                } ${!isPremiumUser ? 'opacity-60' : ''}`}
              >
                <ThumbsDown className="w-4 h-4" />
                <span>{userLikeType === 'negativo' ? 'Não curtido' : 'Não curtir'}</span>
                {!isPremiumUser && <Crown className="w-3 h-3 ml-1" />}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const SupportGroupDetail = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [showSymptoms, setShowSymptoms] = useState(false);
  const [showAddTestimonial, setShowAddTestimonial] = useState(false);
  const [showEditTestimonial, setShowEditTestimonial] = useState(false);
  const [editingTestimonial, setEditingTestimonial] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();
  const [filter, setFilter] = useState<'all' | 'mine'>('all');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeModalFeature, setUpgradeModalFeature] = useState('');
  
  const { subscribed, subscriptionTier } = useSubscription();
  
  const groupName = location.state?.groupName || 'Grupo de Apoio';
  const { testimonials, loading: testimonialsLoading, likeTestimonial, updateTestimonial, deleteTestimonial, refetch } = useGroupTestimonials(groupId || '', filter === 'mine');
  const { symptoms, loading: symptomsLoading } = useGroupSymptoms(groupName);

  // Get current user ID
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id);
    };
    getCurrentUser();
  }, []);

  if (!groupId) {
    navigate('/support-groups');
    return null;
  }

  const handleTestimonialAdded = () => {
    setShowAddTestimonial(false);
    refetch(filter === 'mine');
  };

  const handleEditTestimonial = (testimonial: any) => {
    setEditingTestimonial(testimonial);
    setShowEditTestimonial(true);
  };

  const handleUpdateTestimonial = async (testimonialId: string, updates: any) => {
    const success = await updateTestimonial(testimonialId, updates);
    if (success) {
      setShowEditTestimonial(false);
      setEditingTestimonial(null);
    }
    return success;
  };

  const handleDeleteTestimonial = async (testimonialId: string) => {
    await deleteTestimonial(testimonialId);
  };

  const handleFilterChange = (newFilter: 'all' | 'mine') => {
    setFilter(newFilter);
    refetch(newFilter === 'mine');
  };

  const handleAddTestimonialClick = () => {
    if (!subscribed || (subscriptionTier !== 'Plus' && subscriptionTier !== 'Premium')) {
      setUpgradeModalFeature('Criar Depoimento');
      setShowUpgradeModal(true);
      return;
    }
    setShowAddTestimonial(true);
  };

  const handleLikeClick = (testimonialId: string, tipo: 'positivo' | 'negativo' | 'none') => {
    if (!subscribed || (subscriptionTier !== 'Plus' && subscriptionTier !== 'Premium')) {
      setUpgradeModalFeature('Avaliar Depoimentos');
      setShowUpgradeModal(true);
      return;
    }
    likeTestimonial(testimonialId, tipo);
  };

  const isPremiumUser = subscribed && (subscriptionTier === 'Plus' || subscriptionTier === 'Premium');

  return (
    <div className="has-tabs">
      <div className="screen">
        <main className="container mx-auto px-4 py-6">
          <div className="mb-6">
            <BackButton to="/support-groups" label="Voltar para Grupos" />
          </div>
          
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center space-y-3">
              <h1 className="text-2xl font-bold text-foreground">
                {groupName}
              </h1>
              
              <div className="flex items-center justify-center gap-2">
                <Dialog open={showSymptoms} onOpenChange={setShowSymptoms}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Info className="w-4 h-4 mr-2" />
                      Ver sintomas
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Sintomas relacionados - {groupName}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2">
                      {symptomsLoading ? (
                        <div className="space-y-2">
                          {[...Array(5)].map((_, i) => (
                            <Skeleton key={i} className="h-4 w-full" />
                          ))}
                        </div>
                      ) : symptoms.length > 0 ? (
                        <ul className="space-y-2">
                          {symptoms.map((symptom, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm">
                              <span className="w-1 h-1 bg-primary rounded-full mt-2 flex-shrink-0" />
                              <span>{symptom}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-muted-foreground text-sm">
                          Nenhum sintoma específico cadastrado para este grupo.
                        </p>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Filter and Add Testimonial */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <Select value={filter} onValueChange={(value: 'all' | 'mine') => handleFilterChange(value)}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os depoimentos</SelectItem>
                    <SelectItem value="mine">Meus depoimentos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Add Testimonial Button */}
              <Dialog open={showAddTestimonial} onOpenChange={setShowAddTestimonial}>
                <DialogTrigger asChild>
                  <Button 
                    onClick={handleAddTestimonialClick}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    disabled={!isPremiumUser}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Depoimento
                    {!isPremiumUser && <Crown className="w-4 h-4 ml-2" />}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Adicionar Depoimento</DialogTitle>
                  </DialogHeader>
                  <AddTestimonialForm
                    groupId={groupId}
                    groupName={groupName}
                    onSuccess={handleTestimonialAdded}
                  />
                </DialogContent>
              </Dialog>
            </div>

            {/* Edit Testimonial Dialog */}
            <Dialog open={showEditTestimonial} onOpenChange={setShowEditTestimonial}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Editar Depoimento</DialogTitle>
                </DialogHeader>
                {editingTestimonial && (
                  <EditTestimonialForm
                    groupName={groupName}
                    testimonial={editingTestimonial}
                    onSave={handleUpdateTestimonial}
                    onCancel={() => {
                      setShowEditTestimonial(false);
                      setEditingTestimonial(null);
                    }}
                  />
                )}
              </DialogContent>
            </Dialog>

            {/* Testimonials */}
            <div className="space-y-4">
              {testimonialsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          <Skeleton className="w-10 h-10 rounded-full" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-4 w-1/2" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : testimonials.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                      <User className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      {filter === 'mine' ? 'Você ainda não tem depoimentos' : 'Ainda não há depoimentos'}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {filter === 'mine' 
                        ? 'Compartilhe sua primeira experiência neste grupo.' 
                        : 'Seja o primeiro a compartilhar sua experiência neste grupo.'
                      }
                    </p>
                    <Button 
                      onClick={handleAddTestimonialClick}
                      className="bg-primary hover:bg-primary/90"
                      disabled={!isPremiumUser}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {filter === 'mine' ? 'Adicionar Meu Primeiro Depoimento' : 'Adicionar Primeiro Depoimento'}
                      {!isPremiumUser && <Crown className="w-4 h-4 ml-2" />}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                testimonials.map((testimonial) => (
                  <TestimonialCard
                    key={testimonial.id}
                    testimonial={testimonial}
                    symptomName={
                      testimonial.transtornos_sintomas?.sintomas?.[0] || undefined
                    }
                    onLike={handleLikeClick}
                    onEdit={handleEditTestimonial}
                    onDelete={handleDeleteTestimonial}
                    currentUserId={currentUserId}
                    groupName={groupName}
                    isPremiumUser={isPremiumUser}
                  />
                ))
              )}
            </div>

            {/* Subscription Upgrade Modal */}
            <SubscriptionUpgradeModal
              isOpen={showUpgradeModal}
              onClose={() => setShowUpgradeModal(false)}
              feature={upgradeModalFeature}
            />
          </div>
        </main>
      </div>
      <BottomNavigation />
    </div>
  );
};

export default SupportGroupDetail;