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
  onReschedule: (scheduledAt: string, notes: string) => void;
  loading?: boolean;
}

export const RejectAppointmentModal: React.FC<RejectAppointmentModalProps> = ({
  isOpen,
  onClose,
  onReject,
  onReschedule,
  loading = false
}) => {
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);

  const handleRejectOnly = () => {
    onReject();
    onClose();
  };

  const handleSuggestReschedule = () => {
    setShowRescheduleModal(true);
  };

  const handleRescheduleConfirm = (scheduledAt: string, notes: string) => {
    onReschedule(scheduledAt, notes);
    setShowRescheduleModal(false);
    onClose();
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
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Recusar Consulta
            </DialogTitle>
            <DialogDescription>
              Você pode simplesmente recusar ou sugerir um novo horário para o paciente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                O que você gostaria de fazer com esta consulta?
              </p>
            </div>

            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start h-auto p-4"
                onClick={handleSuggestReschedule}
                disabled={loading}
              >
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div className="text-left">
                    <p className="font-medium">Sugerir novo horário</p>
                    <p className="text-sm text-muted-foreground">
                      Propor uma nova data e horário para o paciente
                    </p>
                  </div>
                </div>
              </Button>

              <Button
                variant="destructive"
                className="w-full justify-start h-auto p-4"
                onClick={handleRejectOnly}
                disabled={loading}
              >
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5" />
                  <div className="text-left">
                    <p className="font-medium">Recusar consulta</p>
                    <p className="text-sm text-destructive-foreground/80">
                      Recusar definitivamente sem sugestão
                    </p>
                  </div>
                </div>
              </Button>
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <Button
                variant="ghost"
                onClick={handleClose}
                className="flex-1"
                disabled={loading}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <RescheduleModal
        isOpen={showRescheduleModal}
        onClose={handleRescheduleClose}
        onConfirm={handleRescheduleConfirm}
        loading={loading}
      />
    </>
  );
};