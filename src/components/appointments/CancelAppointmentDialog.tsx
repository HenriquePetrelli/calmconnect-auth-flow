import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cancellationNotice, type CancellableAppointment } from '@/lib/appointmentCancellation';
import { getFriendlyErrorMessage } from '@/utils/errorMessage';

interface CancelAppointmentDialogProps {
  appointment: CancellableAppointment & { id: string };
  by: 'patient' | 'psychologist';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancelled?: () => void;
}

/** Confirmação de cancelamento: motivo (opcional) e o que acontece com a consulta do mês. */
const CancelAppointmentDialog = ({ appointment, by, open, onOpenChange, onCancelled }: CancelAppointmentDialogProps) => {
  const { toast } = useToast();
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('cancel_appointment', {
        p_appointment_id: appointment.id,
        p_reason: reason.trim() || undefined,
      });
      if (error) throw error;
      const refunded = (data as { refunded?: boolean } | null)?.refunded;
      toast({
        title: 'Consulta cancelada',
        description:
          by === 'patient'
            ? refunded
              ? 'Sua consulta do mês voltou: você pode agendar outro horário.'
              : 'O psicólogo foi avisado.'
            : 'O paciente foi avisado.',
      });
      setReason('');
      onOpenChange(false);
      onCancelled?.();
    } catch (error) {
      toast({
        title: 'Não foi possível cancelar',
        description: getFriendlyErrorMessage(error, 'Tente de novo em instantes.'),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancelar consulta?</AlertDialogTitle>
          <AlertDialogDescription>{cancellationNotice(appointment, by)}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label htmlFor="cancel-reason">Motivo (opcional)</Label>
          <Textarea
            id="cancel-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, 500))}
            placeholder={by === 'patient' ? 'Ex.: imprevisto no trabalho' : 'Ex.: imprevisto de saúde'}
            rows={3}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={saving}>Voltar</AlertDialogCancel>
          <Button variant="destructive" onClick={handleConfirm} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
            Cancelar consulta
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default CancelAppointmentDialog;
