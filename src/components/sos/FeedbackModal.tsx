import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePatientStatistics } from '@/hooks/usePatientStatistics';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  userType: 'patient' | 'psychologist';
  sessionId: string;
  partnerName?: string;
  onRedirect?: () => void;
}

export const FeedbackModal = ({ isOpen, onClose, userType, sessionId, partnerName, onRedirect }: FeedbackModalProps) => {
  const [rating, setRating] = useState<number>(0);
  const [problemResolved, setProblemResolved] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { addActivity } = usePatientStatistics();

  const handleStarClick = (star: number) => {
    setRating(star);
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        title: 'Avaliação obrigatória',
        description: 'Por favor, selecione uma avaliação de 1 a 5 estrelas.',
        variant: 'destructive',
      });
      return;
    }

    if (userType === 'patient' && !problemResolved) {
      toast({
        title: 'Resposta obrigatória',
        description: 'Por favor, responda se o psicólogo conseguiu ajudar.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Save feedback to database
      const { error: feedbackError } = await supabase
        .from('session_feedback')
        .insert({
          session_id: sessionId,
          user_id: user.id,
          user_type: userType,
          rating,
          problem_resolved: userType === 'patient' ? problemResolved : null,
        });

      if (feedbackError) {
        throw feedbackError;
      }

      // Update psychologist average rating if it's a patient rating
      if (userType === 'patient') {
        const { data: session } = await supabase
          .from('webrtc_sessions')
          .select('psychologist_id')
          .eq('id', sessionId)
          .single();

        if (session?.psychologist_id) {
          const { data: avgRating } = await supabase
            .rpc('calculate_psychologist_average_rating', {
              psychologist_user_id: session.psychologist_id
            });

          if (avgRating !== null) {
            await supabase
              .from('psychologists')
              .update({ average_rating: avgRating })
              .eq('user_id', session.psychologist_id);
          }
        }
      }

      toast({
        title: 'Obrigado!',
        description: 'Sua avaliação foi enviada com sucesso.',
      });

      // Track activity only for patients
      if (userType === 'patient') {
        // Check if it's an emergency session or regular appointment
        const { data: emergencyData } = await supabase
          .from('emergency_requests')
          .select('id')
          .eq('video_room_id', sessionId)
          .maybeSingle();

        if (emergencyData) {
          addActivity("SOS de Emergência");
        } else {
          addActivity("Consulta com Psicólogo");
        }
      }

      handleClose();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao enviar avaliação. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
    if (onRedirect) {
      setTimeout(onRedirect, 100);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            Como foi sua experiência?
          </DialogTitle>
        </DialogHeader>

        <Card>
          <CardContent className="p-6 space-y-6">
            {/* Partner name */}
            {partnerName && (
              <div className="text-center">
                <p className="text-muted-foreground">
                  {userType === 'patient' 
                    ? `Psicólogo: ${partnerName}` 
                    : `Paciente: ${partnerName}`
                  }
                </p>
              </div>
            )}

            {/* Star rating */}
            <div className="text-center space-y-2">
              <p className="font-medium">
                {userType === 'patient' 
                  ? 'Como você avalia o atendimento?' 
                  : 'Como foi o atendimento com o paciente?'
                }
              </p>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleStarClick(star)}
                    className="transition-colors hover:scale-110"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300 hover:text-yellow-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Additional question for patients */}
            {userType === 'patient' && (
              <div className="space-y-3">
                <Label className="font-medium">
                  O psicólogo conseguiu resolver seu problema?
                </Label>
                 <RadioGroup value={problemResolved} onValueChange={setProblemResolved}>
                   <div className="flex items-center space-x-2">
                     <RadioGroupItem value="yes" id="yes" />
                     <Label htmlFor="yes">Sim, conseguiu me ajudar</Label>
                   </div>
                   <div className="flex items-center space-x-2">
                     <RadioGroupItem value="no" id="no" />
                     <Label htmlFor="no">Não conseguiu me ajudar</Label>
                   </div>
                 </RadioGroup>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
               <Button
                 variant="outline"
                 className="flex-1"
                 onClick={handleClose}
                 disabled={isSubmitting}
               >
                 Pular
               </Button>
              <Button
                className="flex-1"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Enviando...' : 'Enviar'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
};