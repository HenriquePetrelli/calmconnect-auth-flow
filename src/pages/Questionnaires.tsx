import { useNavigate } from 'react-router-dom';
import { ChevronRight, ClipboardList, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import PageHeader from '@/components/PageHeader';
import PatientBottomNav from '@/components/PatientBottomNav';
import { useScreenings } from '@/hooks/useScreenings';
import {
  INSTRUMENTS,
  RETAKE_DAYS,
  SEVERITY_LABEL,
  daysSince,
  dueInstruments,
  type Instrument,
  type Screening,
} from '@/lib/screenings';

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

/** Evolução das últimas pontuações: barras do mais antigo ao mais recente. */
const ScoreHistory = ({ items, max }: { items: Screening[]; max: number }) => (
  <div className="flex items-end gap-2" role="list" aria-label="Pontuações anteriores">
    {items.map((s) => (
      <div key={s.id} role="listitem" className="flex min-w-0 flex-1 flex-col items-center gap-1" aria-label={`${formatDate(s.created_at)}: ${s.score} pontos`}>
        <span className="text-xs tabular-nums text-muted-foreground">{s.score}</span>
        <div className="flex h-16 w-full items-end rounded-md bg-muted">
          <div className="w-full rounded-md bg-primary/70" style={{ height: `${Math.max(4, (s.score / max) * 100)}%` }} />
        </div>
        <span className="text-xs text-muted-foreground">{formatDate(s.created_at)}</span>
      </div>
    ))}
  </div>
);

/** Questionários do mês (GAD-7 e PHQ-9): quando responder, últimos resultados e compartilhamento. */
const Questionnaires = () => {
  const navigate = useNavigate();
  const { history, loading, error, setShared } = useScreenings();
  const due = dueInstruments(history);

  return (
    <div className="has-tabs">
      <div className="screen">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
          <PageHeader title="Questionários do mês" backTo="/statistics" />
        </div>

        <main className="mx-auto max-w-2xl space-y-5 p-4">
          <p className="text-sm text-muted-foreground">
            Uma vez por mês, responda dois questionários curtos usados por profissionais do mundo todo. Assim você acompanha
            como a ansiedade e o humor mudam com o tempo. Só você vê os resultados, a não ser que escolha mostrar ao seu
            psicólogo.
          </p>

          {loading ? (
            <Skeleton className="h-48 w-full rounded-2xl" />
          ) : error ? (
            <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
              Não foi possível carregar agora. Verifique a conexão e tente de novo.
            </p>
          ) : (
            (['gad7', 'phq9'] as Instrument[]).map((instrument) => {
              const info = INSTRUMENTS[instrument];
              const mine = history.filter((s) => s.instrument === instrument);
              const last = mine[mine.length - 1];
              const isDue = due.includes(instrument);
              const waitDays = last ? RETAKE_DAYS - daysSince(last.created_at) : 0;
              return (
                <section key={instrument} className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm" aria-labelledby={`title-${instrument}`}>
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <ClipboardList className="h-5 w-5 text-primary" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 id={`title-${instrument}`} className="text-base font-semibold text-foreground">{info.title}</h2>
                      <p className="text-sm text-muted-foreground">
                        {last
                          ? `Último: ${SEVERITY_LABEL[last.severity].toLowerCase()} (${last.score} de ${info.maxScore}) em ${formatDate(last.created_at)}`
                          : info.about}
                      </p>
                    </div>
                  </div>

                  {mine.length > 1 && <ScoreHistory items={mine.slice(-6)} max={info.maxScore} />}

                  <Button
                    className="w-full min-h-11 gap-1"
                    variant={isDue ? 'default' : 'outline'}
                    onClick={() => navigate(`/questionarios/${instrument}`)}
                  >
                    {last ? 'Responder de novo' : 'Responder agora'}
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  {!isDue && last && (
                    <p className="-mt-2 text-center text-xs text-muted-foreground">
                      O próximo fica disponível em {waitDays} {waitDays === 1 ? 'dia' : 'dias'}, mas você pode responder antes se quiser.
                    </p>
                  )}

                  {last && (
                    <div className="flex items-start justify-between gap-3 border-t border-border pt-3">
                      <div className="flex gap-2">
                        <Share2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <div>
                          <p className="text-sm font-medium text-foreground">Mostrar o último resultado aos meus psicólogos</p>
                          <p className="text-xs text-muted-foreground">Só quem atende você vê.</p>
                        </div>
                      </div>
                      <Switch
                        aria-label={`Mostrar o último resultado de ${info.shortTitle.toLowerCase()} aos meus psicólogos`}
                        checked={last.shared_with_psychologist}
                        onCheckedChange={(checked) => setShared(last.id, checked).catch(() => toast.error('Não foi possível salvar.'))}
                      />
                    </div>
                  )}
                </section>
              );
            })
          )}

          <p className="text-xs text-muted-foreground">
            GAD-7 e PHQ-9 são questionários de triagem (Spitzer et al., 2006; Kroenke et al., 2001). Eles não fazem diagnóstico:
            só um profissional pode avaliar o seu caso.
          </p>
        </main>
      </div>
      <PatientBottomNav />
    </div>
  );
};

export default Questionnaires;
