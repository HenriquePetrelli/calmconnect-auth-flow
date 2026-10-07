import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { History } from 'lucide-react';
import { PatientSessionHistory } from './PatientSessionHistory';

interface PatientHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string | null;
  patientName: string;
}

export const PatientHistoryModal = ({ isOpen, onClose, patientId, patientName }: PatientHistoryModalProps) => (
  <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
    <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          Histórico de {patientName}
        </DialogTitle>
        <DialogDescription>Resumos das consultas anteriores concluídas com este paciente.</DialogDescription>
      </DialogHeader>
      {isOpen && <PatientSessionHistory patientId={patientId} />}
    </DialogContent>
  </Dialog>
);
