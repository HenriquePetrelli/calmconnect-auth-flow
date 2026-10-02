import { useMemo } from 'react';
import { Lightbulb } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useHabits } from '@/hooks/useHabits';
import { usePatientMoodHistory } from '@/hooks/usePatientMoodHistory';
import { computeInsights, daysWithData } from '@/lib/insights';

/** Quantos dias com humor e hábitos registrados costumam bastar para aparecer algo. */
const DAYS_TO_START = 7;

/**
 * "Seus padrões": o que o humor tem a ver com sono, movimento, água, cafeína,
 * tela e atividades, a partir do que a própria pessoa registra.
 */
const InsightsCard = ({ max = 3 }: { max?: number }) => {
  const { habits, events, loading: habitsLoading } = useHabits();
  const { entries, loading: moodLoading } = usePatientMoodHistory(60);

  const moodByDate = useMemo(() => new Map(entries.map((e) => [e.date, e.value])), [entries]);
  const insights = useMemo(() => computeInsights(moodByDate, habits, events), [moodByDate, habits, events]);
  const withData = daysWithData(moodByDate, events);

  if (habitsLoading || moodLoading) return <Skeleton className="h-32 w-full rounded-2xl" />;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" aria-hidden="true" />
          Seus padrões
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.length > 0 ? (
          <>
            <ul className="space-y-2">
              {insights.slice(0, max).map((insight) => (
                <li key={insight.key} className="rounded-xl bg-primary/5 p-3 text-sm text-foreground">
                  {insight.text}
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              Com base nos últimos 60 dias do que você registrou. Mostra o que costuma andar junto, não a causa.
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            {habits.length === 0
              ? 'Registre o humor e acompanhe um hábito (sono, água, movimento…) para descobrir o que faz bem para você.'
              : withData < DAYS_TO_START
                ? `Continue registrando o humor e os hábitos: com cerca de ${DAYS_TO_START} dias (você tem ${withData}), começamos a mostrar o que anda junto com os seus dias melhores.`
                : 'Ainda não apareceu nenhum padrão claro. Continue registrando: ele pode surgir nas próximas semanas.'}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default InsightsCard;
