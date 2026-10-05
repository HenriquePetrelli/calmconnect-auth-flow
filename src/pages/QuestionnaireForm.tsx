import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CalendarPlus, Check, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import PageHeader from '@/components/PageHeader';
import PatientBottomNav from '@/components/PatientBottomNav';
import HomeCrisisAccess from '@/components/HomeCrisisAccess';
import { useScreenings } from '@/hooks/useScreenings';
import { cn } from '@/lib/utils';
import {
  ANSWER_OPTIONS,
  INSTRUMENTS,
  QUESTION_PROMPT,
  SEVERITY_LABEL,
  changeSincePrevious,
  severityGuidance,
  suggestsProfessional,
  type Instrument,
  type Screening,
} from '@/lib/screenings';
import LifeRingIcon from '@/components/icons/LifeRingIcon';

/** /questionarios/:instrument — responder o GAD-7 ou o PHQ-9 e ver o resultado. */
const QuestionnaireForm = () => {
  const navigate = useNavigate();
  const { instrument: param } = useParams();
  const instrument: Instrument | null = param === 'gad7' || param === 'phq9' ? param : null;
  const { history, save, setShared } = useScreenings();
  const [answers, setAnswers] = useState<(number | null)[]>(() => Array(instrument ? INSTRUMENTS[instrument].questions.length : 0).fill(null));
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<Screening | null>(null);

  if (!instrument) {
    return (
      <div className="screen p-4">
        <p className="text-foreground">Questionário não encontrado.</p>
        <Button className="mt-3" onClick={() => navigate('/questionarios')}>Ver questionários</Button>
      </div>
    );
  }

  const info = INSTRUMENTS[instrument];
  const answered = answers.filter((a) => a !== null).length;
  const complete = answered === answers.length;

  const submit = async () => {
    if (!complete) return;
    setSaving(true);
    try {
      setResult(await save(instrument, answers as number[]));
      window.scrollTo({ top: 0 });
    } catch (error) {
      console.error('Erro ao salvar questionário', error);
      toast.error('Não foi possível salvar agora. Tente de novo.');
    } finally {
      setSaving(false);
    }
  };

  const shownResult = result ? history.find((s) => s.id === result.id) ?? result : null;
  const change = shownResult ? changeSincePrevious(shownResult, history) : null;

  return (
    <div className="has-tabs">
      <div className="screen">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
          <PageHeader title={info.title} backTo="/questionarios" />
        </div>

        <main className="mx-auto max-w-2xl space-y-5 p-4">
          {shownResult ? (
            <>
              <section className="space-y-2 rounded-2xl bg-primary/5 p-6 text-center" aria-live="polite">
                <p className="text-sm text-muted-foreground">Sintomas de {info.shortTitle.toLowerCase() === 'humor' ? 'depressão' : 'ansiedade'}</p>
                <p className="text-3xl font-bold text-foreground">{SEVERITY_LABEL[shownResult.severity]}</p>
                <p className="text-sm text-muted-foreground tabular-nums">
                  {shownResult.score} de {info.maxScore} pontos
                </p>
                {change && (
                  <p className="text-sm text-foreground">
                    {change.delta === 0
                      ? 'Igual ao mês anterior.'
                      : change.delta < 0
                        ? `${Math.abs(change.delta)} pontos a menos que da última vez${change.meaningful ? ': uma melhora importante.' : '.'}`
                        : `${change.delta} pontos a mais que da última vez.`}
                  </p>
                )}
              </section>

              {shownResult.self_harm_flag && (
                <section className="space-y-3 rounded-2xl border border-destructive/40 bg-destructive/5 p-4" role="alert">
                  <h2 className="text-base font-semibold text-foreground">Você não está sozinho(a)</h2>
                  <p className="text-sm text-foreground">
                    Você contou que pensou em se ferir ou que seria melhor estar morto(a). Isso é importante e tem ajuda. Fale com
                    alguém agora: o CVV atende 24 horas, de graça, pelo 188. No app, o SOS conecta você a um psicólogo.
                  </p>
                  <HomeCrisisAccess />
                  <Button className="w-full min-h-11 gap-2" variant="destructive" onClick={() => navigate('/sos')}>
                    <LifeRingIcon className="h-4 w-4" aria-hidden="true" />
                    Abrir o SOS
                  </Button>
                </section>
              )}

              <p className="rounded-xl border border-border bg-card p-4 text-sm text-foreground">{severityGuidance(shownResult.severity)}</p>

              {suggestsProfessional(shownResult.severity) && (
                <Button className="w-full min-h-11 gap-2" onClick={() => navigate('/appointments')}>
                  <CalendarPlus className="h-4 w-4" aria-hidden="true" />
                  Agendar consulta
                </Button>
              )}

              <div className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-4">
                <div>
                  <Label htmlFor="share-result" className="text-sm font-medium">
                    Mostrar aos meus psicólogos
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Só os psicólogos com quem você tem consulta veem o resultado. Você pode desligar quando quiser.
                  </p>
                </div>
                <Switch
                  id="share-result"
                  checked={shownResult.shared_with_psychologist}
                  onCheckedChange={(checked) => setShared(shownResult.id, checked).catch(() => toast.error('Não foi possível salvar.'))}
                />
              </div>

              <p className="text-xs text-muted-foreground">
                Este questionário ajuda a acompanhar como você está. Ele não faz diagnóstico: só um profissional pode avaliar o
                seu caso.
              </p>

              <Button variant="outline" className="w-full min-h-11 gap-2" onClick={() => navigate('/questionarios')}>
                <ClipboardList className="h-4 w-4" aria-hidden="true" />
                Ver meu histórico
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">{info.about} Não existe resposta certa: responda pensando em você.</p>
              <p className="text-base font-medium text-foreground">{QUESTION_PROMPT}</p>

              <ol className="space-y-4">
                {info.questions.map((question, qi) => (
                  <li key={qi} className="space-y-2 rounded-2xl border border-border bg-card p-4">
                    <p id={`q-${qi}`} className="text-sm font-medium text-foreground">
                      {qi + 1}. {question}
                    </p>
                    <div role="radiogroup" aria-labelledby={`q-${qi}`} className="grid grid-cols-2 gap-2">
                      {ANSWER_OPTIONS.map((option) => {
                        const selected = answers[qi] === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => setAnswers((prev) => prev.map((a, i) => (i === qi ? option.value : a)))}
                            className={cn(
                              'flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors',
                              selected ? 'border-primary bg-primary/10 font-medium text-primary' : 'border-border text-foreground hover:bg-muted/50',
                            )}
                          >
                            {selected && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </li>
                ))}
              </ol>

              <div className="sticky bottom-20 space-y-2 rounded-2xl border border-border bg-card/95 p-3 backdrop-blur-sm">
                <p className="text-center text-xs text-muted-foreground" aria-live="polite">
                  {answered} de {answers.length} respondidas
                </p>
                <Button className="w-full min-h-12" disabled={!complete || saving} onClick={submit}>
                  {saving ? 'Salvando...' : 'Ver meu resultado'}
                </Button>
              </div>
            </>
          )}
        </main>
      </div>
      <PatientBottomNav />
    </div>
  );
};

export default QuestionnaireForm;
