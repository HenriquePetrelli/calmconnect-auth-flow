import { useNavigate } from 'react-router-dom';
import { ChevronRight, ClipboardList } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useScreenings } from '@/hooks/useScreenings';
import { INSTRUMENTS, SEVERITY_LABEL, dueInstruments } from '@/lib/screenings';

/** Atalho para os questionários do mês, com aviso quando está na hora de responder. */
const QuestionnairesCard = () => {
  const navigate = useNavigate();
  const { history, loading } = useScreenings();
  if (loading) return null;

  const due = dueInstruments(history);
  const lastGad = [...history].reverse().find((s) => s.instrument === 'gad7');
  const lastPhq = [...history].reverse().find((s) => s.instrument === 'phq9');
  const subtitle =
    history.length === 0
      ? 'Ansiedade e humor em 5 minutos, uma vez por mês'
      : due.length > 0
        ? `Hora de responder: ${due.map((i) => INSTRUMENTS[i].shortTitle.toLowerCase()).join(' e ')}`
        : [lastGad && `Ansiedade: ${SEVERITY_LABEL[lastGad.severity].toLowerCase()}`, lastPhq && `Humor: ${SEVERITY_LABEL[lastPhq.severity].toLowerCase()}`]
            .filter(Boolean)
            .join(' · ');

  return (
    <Card className={due.length > 0 ? 'border-primary/40' : undefined}>
      <CardContent className="p-0">
        <button type="button" onClick={() => navigate('/questionarios')} className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/40">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <ClipboardList className="h-5 w-5 text-primary" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-foreground">Questionários do mês</span>
            <span className="block text-sm text-muted-foreground">{subtitle}</span>
          </span>
          {due.length > 0 && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary" aria-label="Pendente" />}
          <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </button>
      </CardContent>
    </Card>
  );
};

export default QuestionnairesCard;
