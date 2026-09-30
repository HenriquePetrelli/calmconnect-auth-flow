import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wind } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CRAVING_TRIGGERS } from '@/lib/habits';

interface CravingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason?: string;
  onSave: (intensity: number, triggers: string[], note: string) => Promise<void>;
}

const INTENSITY_LABELS = ['Leve', 'Fraca', 'Média', 'Forte', 'Muito forte'];

/**
 * "Senti vontade": registra a vontade (intensidade e gatilhos, para a pessoa
 * enxergar os padrões) e oferece ajuda na hora: o motivo dela para parar e a
 * respiração guiada, porque a vontade costuma passar em poucos minutos.
 */
const CravingDialog = ({ open, onOpenChange, reason, onSave }: CravingDialogProps) => {
  const navigate = useNavigate();
  const [intensity, setIntensity] = useState(3);
  const [triggers, setTriggers] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const reset = () => {
    setIntensity(3);
    setTriggers([]);
    setNote('');
    setSaved(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(intensity, triggers, note.trim());
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        {saved ? (
          <>
            <DialogHeader>
              <DialogTitle>Você está passando por isso</DialogTitle>
              <DialogDescription>
                A vontade vem em ondas e costuma passar em poucos minutos. Respire com calma enquanto ela passa.
              </DialogDescription>
            </DialogHeader>
            {reason && (
              <blockquote className="rounded-lg border-l-4 border-primary bg-primary/5 p-3 text-sm">
                <span className="block text-xs text-muted-foreground">O seu motivo</span>
                {reason}
              </blockquote>
            )}
            <div className="flex flex-col gap-2">
              <Button
                className="min-h-11"
                onClick={() => {
                  handleOpenChange(false);
                  navigate('/breathing');
                }}
              >
                <Wind className="mr-2 h-4 w-4" aria-hidden="true" />
                Fazer a respiração guiada
              </Button>
              <Button variant="ghost" onClick={() => handleOpenChange(false)}>
                Fechar
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Senti vontade</DialogTitle>
              <DialogDescription>Registrar ajuda a perceber o que costuma disparar a vontade.</DialogDescription>
            </DialogHeader>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Intensidade</legend>
              <div className="grid grid-cols-5 gap-1">
                {INTENSITY_LABELS.map((label, i) => (
                  <Button
                    key={label}
                    type="button"
                    size="sm"
                    variant={intensity === i + 1 ? 'default' : 'outline'}
                    onClick={() => setIntensity(i + 1)}
                    aria-pressed={intensity === i + 1}
                    className="h-auto px-1 py-2 text-xs"
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </fieldset>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">O que estava acontecendo?</legend>
              <div className="flex flex-wrap gap-2">
                {CRAVING_TRIGGERS.map((trigger) => {
                  const selected = triggers.includes(trigger);
                  return (
                    <button
                      key={trigger}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setTriggers((prev) => (selected ? prev.filter((t) => t !== trigger) : [...prev, trigger]))}
                      className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                        selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card hover:bg-muted'
                      }`}
                    >
                      {trigger}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="space-y-1.5">
              <Label htmlFor="craving-note">Anotação (opcional)</Label>
              <Textarea id="craving-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={2} />
            </div>

            <Button className="w-full min-h-11" onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Registrar vontade'}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CravingDialog;
