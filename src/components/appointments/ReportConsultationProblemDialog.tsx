import { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getFriendlyErrorMessage } from '@/utils/errorMessage';

interface ReportConsultationProblemDialogProps {
  appointmentId: string | null;
  role: 'patient' | 'psychologist';
  onOpenChange: (open: boolean) => void;
  /** Chamado depois de registrar; `refunded` quando a consulta foi cancelada e devolvida. */
  onReported?: (refunded: boolean) => void;
}

const COPY = {
  patient: {
    title: 'Relatar problema na consulta',
    description:
      'Caiu a conexão, não deu para ouvir, o psicólogo não apareceu? Conte o que houve: o psicólogo é avisado e, se a consulta não aconteceu de verdade, ele confirma e a consulta do mês volta para você.',
    placeholder: 'Ex.: a chamada caiu depois de 10 minutos e não consegui voltar.',
    submit: 'Enviar relato',
  },
  psychologist: {
    title: 'Consulta interrompida por problema técnico',
    description:
      'Use quando a consulta não pôde acontecer ou foi interrompida por falha de conexão. Ela fica como cancelada, não entra no repasse, e a consulta do mês volta para o paciente, que é avisado para remarcar.',
    placeholder: 'Ex.: a conexão do paciente caiu aos 15 minutos e não voltou.',
    submit: 'Confirmar interrupção',
  },
} as const;

const ReportConsultationProblemDialog = ({
  appointmentId,
  role,
  onOpenChange,
  onReported,
}: ReportConsultationProblemDialogProps) => {
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);
  const { toast } = useToast();
  const copy = COPY[role];

  const handleSubmit = async () => {
    if (!appointmentId) return;
    setSending(true);
    try {
      const { data, error } = await supabase.rpc('report_consultation_problem', {
        p_appointment_id: appointmentId,
        p_details: details.trim() || undefined,
      });
      if (error) throw error;
      const refunded = Boolean((data as { refunded?: boolean } | null)?.refunded);
      toast({
        title: refunded ? 'Consulta marcada como interrompida' : 'Relato enviado',
        description: refunded
          ? 'O paciente foi avisado e a consulta do mês voltou para ele.'
          : 'Avisamos o psicólogo. Se ele confirmar que a consulta não aconteceu, a consulta do mês volta para você.',
      });
      setDetails('');
      onReported?.(refunded);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Não foi possível enviar',
        description: getFriendlyErrorMessage(error, 'Tente de novo em instantes.'),
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={Boolean(appointmentId)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center gap-2 sm:justify-start">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <AlertTriangle className="h-4 w-4 text-primary" aria-hidden="true" />
            </span>
            {copy.title}
          </DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="problem-details">O que aconteceu (opcional)</Label>
          <Textarea
            id="problem-details"
            value={details}
            onChange={(e) => setDetails(e.target.value.slice(0, 500))}
            placeholder={copy.placeholder}
            rows={4}
          />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Voltar
          </Button>
          <Button onClick={handleSubmit} disabled={sending}>
            {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
            {copy.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReportConsultationProblemDialog;
