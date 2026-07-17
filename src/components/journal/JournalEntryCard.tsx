import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { JournalEntry } from '@/hooks/usePrivateJournal';
import { getJournalMood } from './journalMoods';
import { cn } from '@/lib/utils';

interface JournalEntryCardProps {
  entry: JournalEntry;
  onEdit: (entry: JournalEntry) => void;
  onDelete: (id: string) => void;
}

const JournalEntryCard = ({ entry, onEdit, onDelete }: JournalEntryCardProps) => {
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }),
      time: date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  };

  const { date, time } = formatDateTime(entry.criado_em);
  const mood = getJournalMood(entry.humor);
  const MoodIcon = mood.Icon;

  return (
    <Card className="mb-4 transition-shadow">
      <CardContent className="p-4">
        {/* Header com humor */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MoodIcon className={cn('w-6 h-6', mood.colorClass)} />
            <span className="text-sm text-muted-foreground">{mood.label}</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(entry)}
              className="h-8 w-8"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(entry.id)}
              className="h-8 w-8 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Conteúdo da entrada */}
        <div className="mb-4">
          <p className="text-foreground leading-relaxed whitespace-pre-wrap">
            {entry.texto}
          </p>
        </div>

        {/* Footer com data e hora */}
        <div className="flex justify-between items-center text-xs text-muted-foreground">
          <span>{date}</span>
          <span>{time}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default JournalEntryCard;