import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { JournalEntry } from '@/hooks/usePrivateJournal';
import { Loader2 } from 'lucide-react';

const moodEmojis = ['😞', '😔', '😐', '🙂', '😊', '😄'];
const moodLabels = ['Muito triste', 'Triste', 'Neutro', 'Bem', 'Feliz', 'Muito feliz'];

interface JournalEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (texto: string, humor: number) => Promise<boolean>;
  entry?: JournalEntry | null;
}

const JournalEntryModal = ({ isOpen, onClose, onSave, entry }: JournalEntryModalProps) => {
  const [texto, setTexto] = useState('');
  const [humor, setHumor] = useState(2);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!entry;

  useEffect(() => {
    if (entry) {
      setTexto(entry.texto);
      setHumor(entry.humor);
    } else {
      setTexto('');
      setHumor(2);
    }
  }, [entry, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!texto.trim()) {
      return;
    }

    setIsSubmitting(true);
    const success = await onSave(texto.trim(), humor);
    
    if (success) {
      onClose();
    }
    
    setIsSubmitting(false);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Entrada' : 'Nova Entrada do Diário'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mood">Como você está se sentindo?</Label>
            <div className="grid grid-cols-3 gap-2">
              {moodEmojis.map((emoji, index) => (
                <Button
                  key={index}
                  type="button"
                  variant={humor === index ? "default" : "outline"}
                  className="h-auto p-3 flex flex-col items-center gap-1"
                  onClick={() => setHumor(index)}
                >
                  <span className="text-lg">{emoji}</span>
                  <span className="text-xs text-center leading-tight">
                    {moodLabels[index]}
                  </span>
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="text">Escreva seus pensamentos</Label>
            <Textarea
              id="text"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Conte como foi seu dia, seus sentimentos, pensamentos..."
              className="min-h-[120px] resize-none"
              disabled={isSubmitting}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!texto.trim() || isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Atualizar' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default JournalEntryModal;