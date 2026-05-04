import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { JournalEntry } from '@/hooks/usePrivateJournal';
import { usePatientStatistics } from '@/hooks/usePatientStatistics';
import { JOURNAL_MOODS, DEFAULT_JOURNAL_MOOD } from './journalMoods';
import { cn } from '@/lib/utils';

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
  const [humor, setHumor] = useState<number>(DEFAULT_JOURNAL_MOOD);
  const { addActivity } = usePatientStatistics();

  useEffect(() => {
    if (editingEntry) {
      setTexto(editingEntry.texto);
      setHumor(editingEntry.humor);
    } else {
      setTexto('');
      setHumor(DEFAULT_JOURNAL_MOOD);
    }
  }, [editingEntry]);

  const handleSave = () => {
    if (!texto.trim()) return;
    onSave(texto.trim(), humor);
    
    // Track activity only for new entries
    if (!editingEntry) {
      addActivity("Diário Privado");
    }
    
    handleClose();
  };

  const handleClose = () => {
    setTexto('');
    setHumor(DEFAULT_JOURNAL_MOOD);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {editingEntry ? 'Editar Anotação' : 'Nova Anotação do Diário'}
          </DialogTitle>
          <DialogDescription>
            {editingEntry 
              ? 'Modifique o texto e humor da sua anotação do diário.' 
              : 'Crie uma nova anotação no seu diário pessoal.'
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
              {JOURNAL_MOODS.map((mood) => {
                const Icon = mood.Icon;
                const isSelected = humor === mood.value;
                return (
                  <Button
                    key={mood.value}
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                    onClick={() => setHumor(mood.value)}
                    className="flex flex-col items-center gap-1 h-auto py-3"
                  >
                    <Icon className={cn('w-6 h-6', !isSelected && mood.colorClass)} />
                    <span className="text-xs">{mood.label}</span>
                  </Button>
                );
              })}
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