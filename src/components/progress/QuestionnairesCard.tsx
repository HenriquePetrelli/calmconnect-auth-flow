import { useNavigate } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { useScreenings } from '@/hooks/useScreenings';
import { INSTRUMENTS, SEVERITY_LABEL, dueInstruments } from '@/lib/screenings';
import { ProgressTile } from './ProgressSection';

/** Atalho para os questionários do mês, com aviso quando está na hora de responder. */
const QuestionnairesCard = () => {
  const navigate = useNavigate();
  const { history, loading } = useScreenings();

  const due = loading ? [] : dueInstruments(history);
  const lastGad = [...history].reverse().find((s) => s.instrument === 'gad7');
  const lastPhq = [...history].reverse().find((s) => s.instrument === 'phq9');
  const subtitle = loading
    ? 'Ansiedade e humor'
    : history.length === 0
      ? 'Ansiedade e humor em 5 minutos'
      : due.length > 0
        ? `Hora de responder: ${due.map((i) => INSTRUMENTS[i].shortTitle.toLowerCase()).join(' e ')}`
        : [lastGad && `Ansiedade: ${SEVERITY_LABEL[lastGad.severity].toLowerCase()}`, lastPhq && `Humor: ${SEVERITY_LABEL[lastPhq.severity].toLowerCase()}`]
            .filter(Boolean)
            .join(' · ');

  return (
    <ProgressTile
      icon={ClipboardList}
      title="Questionários do mês"
      subtitle={subtitle}
      badge={due.length > 0}
      onClick={() => navigate('/questionarios')}
    />
  );
};

export default QuestionnairesCard;
