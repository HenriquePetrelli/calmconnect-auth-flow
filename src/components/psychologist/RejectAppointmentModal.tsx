import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, Calendar } from 'lucide-react';
import { RescheduleModal } from './RescheduleModal';

interface RejectAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReject: () => void;
  onReschedule: (scheduledAt: string, notes: string) => Promise<boolean>;
  loading?: boolean;
  originalDate: string;
}

export const RejectAppointmentModal: React.FC<RejectAppointmentModalProps> = ({
  isOpen,
  onClose,
  onReject,
  onReschedule,
  loading = false,
  originalDate
}) => {
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);

  const handleRejectOnly = () => {
    onReject();
    onClose();
  };

  const handleSuggestReschedule = () => {
    setShowRescheduleModal(true);
  };

  const handleRescheduleConfirm = async (scheduledAt: string, notes: string) => {
    const success = await onReschedule(scheduledAt, notes);
    if (success) {
      setShowRescheduleModal(false);
      onClose();
    }
    // On failure, stay on the RescheduleModal (error already toasted) so
    // the psychologist can pick a different date/time without starting over.
  };

  const handleRescheduleClose = () => {
    setShowRescheduleModal(false);
  };

  const handleClose = () => {
    setShowRescheduleModal(false);
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen && !showRescheduleModal} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <DialogTitle className="text-center text-xl">
              Recusar Consulta
            </DialogTitle>
            <DialogDescription className="text-center">
              Escolha como deseja responder a essa solicitação.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={handleSuggestReschedule}
              disabled={loading}
              className="w-full text-left p-4 rounded-lg border-2 border-border hover:border-primary hover:bg-primary/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Sugerir novo horário</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Propor uma nova data e horário para o paciente
                  </p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={handleRejectOnly}
              disabled={loading}
              className="w-full text-left p-4 rounded-lg border-2 border-border hover:border-destructive hover:bg-destructive/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Recusar consulta</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Recusar definitivamente sem sugerir alternativa
                  </p>
                </div>
              </div>
            </button>
          </div>

          <div className="flex pt-4 border-t">
            <Button
              variant="ghost"
              onClick={handleClose}
              className="w-full"
              disabled={loading}
            >
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <RescheduleModal
        isOpen={showRescheduleModal}
        onClose={handleRescheduleClose}
        onConfirm={handleRescheduleConfirm}
        loading={loading}
        originalDate={originalDate}
      />
    </>
  );
};