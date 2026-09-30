import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatDurationShort } from '@/lib/habits';

interface RelapseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStreakSeconds: number;
  onConfirm: (note: string) => Promise<void>;
}

/** Recaída sem culpa: a contagem recomeça, mas o recorde e o histórico ficam. */
const RelapseDialog = ({ open, onOpenChange, currentStreakSeconds, onConfirm }: RelapseDialogProps) => {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={(next) => { if (!next) setNote(''); onOpenChange(next); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Tudo bem recomeçar</AlertDialogTitle>
          <AlertDialogDescription>
            Recaídas fazem parte de muitos processos de mudança. Os seus {formatDurationShort(currentStreakSeconds)} continuam
            contando como conquista e ficam guardados no seu histórico. A contagem recomeça agora.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="relapse-note">O que aconteceu? (opcional)</Label>
          <Textarea id="relapse-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={3} />
          <p className="text-xs text-muted-foreground">Entender a situação ajuda a se preparar para a próxima vez.</p>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={saving}>Voltar</AlertDialogCancel>
          <AlertDialogAction
            disabled={saving}
            onClick={async (event) => {
              event.preventDefault();
              setSaving(true);
              try {
                await onConfirm(note.trim());
                setNote('');
                onOpenChange(false);
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? 'Salvando...' : 'Recomeçar a contagem'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default RelapseDialog;
