import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Star, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePatientStatistics } from '@/hooks/usePatientStatistics';
import { sosLog } from '@/lib/sosLogger';
import { SINTOMAS } from '@/data/sintomas';


interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  userType: 'patient' | 'psychologist';
  sessionId: string;
  partnerName?: string;
  onRedirect?: () => void;
  /** Mandatory evaluation: no skip, no dismiss — only submitting closes it. */
  required?: boolean;
}

export const FeedbackModal = ({ isOpen, onClose, userType, sessionId, partnerName, onRedirect, required = false }: FeedbackModalProps) => {

  const [rating, setRating] = useState<number>(0);
  const [problemResolved, setProblemResolved] = useState<string>('');
  const [comment, setComment] = useState('');
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [symptomQuery, setSymptomQuery] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alreadySent, setAlreadySent] = useState(false);
  const { toast } = useToast();
  const { addActivity } = usePatientStatistics();

  const isPsychologist = userType === 'psychologist';

  const filteredSymptoms = useMemo(() => {
    const q = symptomQuery.trim().toLowerCase();
    const list = [...SINTOMAS] as string[];
    return q ? list.filter((s) => s.toLowerCase().includes(q)) : list;
  }, [symptomQuery]);

  const toggleSymptom = (symptom: string) =>
    setSymptoms((prev) =>
      prev.includes(symptom) ? prev.filter((s) => s !== symptom) : [...prev, symptom]
    );


  // Idempotency: one feedback per user per session. Reloading the page after
  // finishing must never create a second row nor block the user here.
  useEffect(() => {
    if (!isOpen || !sessionId) return;
    let cancelled = false;

    const checkExisting = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const { data } = await supabase
        .from('session_feedback')
        .select('id')
        .eq('session_id', sessionId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!cancelled && data) {
        sosLog('SESSION', 'feedback already registered — skipping modal', { sessionId });
        setAlreadySent(true);
      }
    };

    checkExisting();
    return () => {
      cancelled = true;
    };
  }, [isOpen, sessionId]);

  useEffect(() => {
    if (alreadySent) handleClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alreadySent]);

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

      // Resolve the related emergency request (if any) so the feedback stays
      // linked even if the webrtc session row is cleaned up later.
      const { data: emergencyRow } = await supabase
        .from('emergency_requests')
        .select('id')
        .eq('video_room_id', sessionId)
        .maybeSingle();

      // Save feedback to database
      const { error: feedbackError } = await supabase
        .from('session_feedback')
        .upsert(
          {
            session_id: sessionId,
            user_id: user.id,
            user_type: userType,
            rating,
            problem_resolved: userType === 'patient' ? problemResolved : null,
            comment: comment.trim() || null,
            emergency_request_id: emergencyRow?.id ?? null,
          },
          { onConflict: 'session_id,user_id' }
        );

      if (feedbackError) {
        throw feedbackError;
      }

      // The psychologist average rating is recalculated server-side by a
      // database trigger on session_feedback (no client-side update needed).


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
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !required) onClose(); }}>
      <DialogContent
        className={`sm:max-w-md ${required ? "[&>button]:hidden" : ""}`}
        onPointerDownOutside={(e) => { if (required) e.preventDefault(); }}
        onEscapeKeyDown={(e) => { if (required) e.preventDefault(); }}
        onInteractOutside={(e) => { if (required) e.preventDefault(); }}
      >
        <DialogHeader>
          <DialogTitle className="text-center">
            Como foi sua experiência?
          </DialogTitle>
          {required && (
            <DialogDescription className="text-center">
              Avalie o atendimento para continuar usando o aplicativo.
            </DialogDescription>
          )}
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
                    className="transition-colors"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= rating
                          ? 'fill-yellow-400 text-warning'
                          : 'text-muted-foreground hover:text-yellow-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Additional question for patients — binary by product rule */}
            {userType === 'patient' && (
              <div className="space-y-3">
                <Label className="font-medium">
                  O psicólogo conseguiu te ajudar?
                </Label>
                 <RadioGroup value={problemResolved} onValueChange={setProblemResolved}>
                   <div className="flex items-center space-x-2">
                     <RadioGroupItem value="yes" id="yes" />
                     <Label htmlFor="yes">Sim, conseguiu me ajudar</Label>
                   </div>
                   <div className="flex items-center space-x-2">
                     <RadioGroupItem value="no" id="no" />
                     <Label htmlFor="no">Não</Label>
                   </div>
                 </RadioGroup>
              </div>
            )}


            {/* Optional free-text comment */}
            <div className="space-y-2">
              <Label htmlFor="feedback-comment" className="font-medium">
                {userType === 'patient' ? 'Conte como foi sua experiência (opcional)' : 'Observações (opcional)'}
              </Label>
              <Textarea
                id="feedback-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder={userType === 'patient'
                  ? 'Compartilhe o que achou do atendimento'
                  : 'Registre observações sobre o atendimento'}
              />
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
               {!required && (
                 <Button
                   variant="outline"
                   className="flex-1"
                   onClick={handleClose}
                   disabled={isSubmitting}
                 >
                   Pular
                 </Button>
               )}
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