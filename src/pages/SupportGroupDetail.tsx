import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Info, Plus, User, ThumbsUp, ThumbsDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useGroupTestimonials, useGroupSymptoms } from '@/hooks/useSupportGroups';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import BottomNavigation from '@/components/BottomNavigation';
import BackButton from '@/components/BackButton';
import AddTestimonialForm from '@/components/support-groups/AddTestimonialForm';

const moodEmojis = ['😞', '😔', '😐', '🙂', '😊', '😄'];
const moodLabels = ['Muito triste', 'Triste', 'Neutro', 'Bem', 'Feliz', 'Muito feliz'];

interface TestimonialCardProps {
  testimonial: {
    id: string;
    user_id: string;
    anonimo: boolean;
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
  onLike: (testimonialId: string, tipo: 'positivo' | 'negativo') => void;
  currentUserId?: string;
}

const TestimonialCard = ({ testimonial, symptomName, onLike, currentUserId }: TestimonialCardProps) => {
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
        
        {/* Like/Dislike buttons */}
        {!isOwnTestimonial && (
          <div className="flex items-center gap-4 pt-2 border-t border-border/50">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onLike(testimonial.id, 'positivo')}
              className={`flex items-center gap-2 h-8 px-3 ${
                userLikeType === 'positivo' 
                  ? 'text-green-600 bg-green-50 hover:bg-green-100' 
                  : 'text-muted-foreground hover:text-green-600'
              }`}
            >
              <ThumbsUp className="w-4 h-4" />
              <span className="text-sm">{testimonial.likes_positivos}</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onLike(testimonial.id, 'negativo')}
              className={`flex items-center gap-2 h-8 px-3 ${
                userLikeType === 'negativo' 
                  ? 'text-red-600 bg-red-50 hover:bg-red-100' 
                  : 'text-muted-foreground hover:text-red-600'
              }`}
            >
              <ThumbsDown className="w-4 h-4" />
              <span className="text-sm">{testimonial.likes_negativos}</span>
            </Button>
          </div>
        )}
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
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();
  
  const groupName = location.state?.groupName || 'Grupo de Apoio';
  const { testimonials, loading: testimonialsLoading, likeTestimonial, refetch } = useGroupTestimonials(groupId || '');
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
    refetch();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 pb-20">
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

          {/* Add Testimonial Button */}
          <div className="flex justify-center">
            <Dialog open={showAddTestimonial} onOpenChange={setShowAddTestimonial}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Depoimento
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
                    Ainda não há depoimentos
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Seja o primeiro a compartilhar sua experiência neste grupo.
                  </p>
                  <Button 
                    onClick={() => setShowAddTestimonial(true)}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Primeiro Depoimento
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
                  onLike={likeTestimonial}
                  currentUserId={currentUserId}
                />
              ))
            )}
          </div>
        </div>
      </div>
      <BottomNavigation />
    </div>
  );
};

export default SupportGroupDetail;