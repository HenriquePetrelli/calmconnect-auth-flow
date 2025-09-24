import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { JournalEntry } from '@/hooks/usePrivateJournal';

const moodEmojis = ['😞', '😔', '😐', '🙂', '😊', '😄'];
const moodLabels = ['Muito triste', 'Triste', 'Neutro', 'Bem', 'Feliz', 'Muito feliz'];

interface JournalEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (texto: string, humor: number) => void;
  editingEntry?: JournalEntry | null;
  loading?: boolean;
}

const JournalEntryModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  editingEntry, 
  loading = false 
}: JournalEntryModalProps) => {
  const [texto, setTexto] = useState('');
  const [humor, setHumor] = useState(2); // Neutro como padrão

  useEffect(() => {
    if (editingEntry) {
      setTexto(editingEntry.texto);
      setHumor(editingEntry.humor);
    } else {
      setTexto('');
      setHumor(2);
    }
  }, [editingEntry]);

  const handleSave = () => {
    if (!texto.trim()) return;
    onSave(texto.trim(), humor);
    handleClose();
  };

  const handleClose = () => {
    setTexto('');
    setHumor(2);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {editingEntry ? 'Editar Entrada' : 'Nova Entrada do Diário'}
          </DialogTitle>
          <DialogDescription>
            {editingEntry 
              ? 'Modifique o texto e humor da sua entrada do diário.' 
              : 'Crie uma nova entrada no seu diário pessoal.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Campo de texto */}
          <div className="space-y-2">
            <Label htmlFor="texto">Como você está se sentindo?</Label>
            <Textarea
              id="texto"
              placeholder="Escreva seus pensamentos e sentimentos..."
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              className="min-h-[120px] resize-none"
              maxLength={1000}
            />
            <div className="text-xs text-muted-foreground text-right">
              {texto.length}/1000 caracteres
            </div>
          </div>

          {/* Seletor de humor */}
          <div className="space-y-2">
            <Label>Como está seu humor?</Label>
            <div className="grid grid-cols-3 gap-2">
              {moodEmojis.map((emoji, index) => (
                <Button
                  key={index}
                  type="button"
                  variant={humor === index ? "default" : "outline"}
                  onClick={() => setHumor(index)}
                  className="flex flex-col items-center gap-1 h-auto py-3"
                >
                  <span className="text-2xl">{emoji}</span>
                  <span className="text-xs">{moodLabels[index]}</span>
                </Button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!texto.trim() || loading}
          >
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default JournalEntryModal;