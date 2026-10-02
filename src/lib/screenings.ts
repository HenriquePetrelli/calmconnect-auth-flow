// Questionários de acompanhamento: GAD-7 (ansiedade) e PHQ-9 (depressão).
// São de domínio público (Pfizer) e usados no mundo todo para triagem e
// acompanhamento; não fazem diagnóstico. Textos na versão em português usada no
// Brasil. A pontuação oficial é calculada no banco (trigger); aqui só para
// mostrar na tela.

export type Instrument = 'gad7' | 'phq9';
export type Severity = 'minimal' | 'mild' | 'moderate' | 'moderately_severe' | 'severe';

export interface Screening {
  id: string;
  instrument: Instrument;
  answers: number[];
  score: number;
  severity: Severity;
  self_harm_flag: boolean;
  shared_with_psychologist: boolean;
  created_at: string;
}

export const ANSWER_OPTIONS = [
  { value: 0, label: 'Nenhuma vez' },
  { value: 1, label: 'Vários dias' },
  { value: 2, label: 'Mais da metade dos dias' },
  { value: 3, label: 'Quase todos os dias' },
] as const;

export const INSTRUMENTS: Record<
  Instrument,
  { title: string; shortTitle: string; about: string; maxScore: number; questions: string[] }
> = {
  gad7: {
    title: 'Ansiedade (GAD-7)',
    shortTitle: 'Ansiedade',
    about: '7 perguntas sobre sintomas de ansiedade nas últimas 2 semanas. Leva 2 minutos.',
    maxScore: 21,
    questions: [
      'Sentir-se nervoso(a), ansioso(a) ou muito tenso(a)',
      'Não ser capaz de impedir ou de controlar as preocupações',
      'Preocupar-se muito com diversas coisas',
      'Dificuldade para relaxar',
      'Ficar tão agitado(a) que se torna difícil permanecer sentado(a)',
      'Ficar facilmente aborrecido(a) ou irritado(a)',
      'Sentir medo como se algo horrível fosse acontecer',
    ],
  },
  phq9: {
    title: 'Humor (PHQ-9)',
    shortTitle: 'Humor',
    about: '9 perguntas sobre sintomas de depressão nas últimas 2 semanas. Leva 3 minutos.',
    maxScore: 27,
    questions: [
      'Pouco interesse ou pouco prazer em fazer as coisas',
      'Sentir-se para baixo, deprimido(a) ou sem esperança',
      'Dificuldade para pegar no sono ou permanecer dormindo, ou dormir mais do que de costume',
      'Sentir-se cansado(a) ou com pouca energia',
      'Falta de apetite ou comer demais',
      'Sentir-se mal consigo mesmo(a), ou achar que é um fracasso ou que decepcionou a si mesmo(a) ou à sua família',
      'Dificuldade para se concentrar nas coisas, como ler o jornal ou ver televisão',
      'Lentidão para se movimentar ou falar, a ponto de outras pessoas perceberem; ou o oposto: estar tão agitado(a) ou inquieto(a) que fica andando de um lado para o outro muito mais do que de costume',
      'Pensar em se ferir de alguma maneira ou que seria melhor estar morto(a)',
    ],
  },
};

export const QUESTION_PROMPT = 'Nas últimas 2 semanas, com que frequência você se sentiu incomodado(a) por:';

/** Mesmos pontos de corte do banco (Spitzer 2006; Kroenke 2001). */
export const severityFor = (instrument: Instrument, score: number): Severity => {
  if (instrument === 'gad7') return score >= 15 ? 'severe' : score >= 10 ? 'moderate' : score >= 5 ? 'mild' : 'minimal';
  return score >= 20 ? 'severe' : score >= 15 ? 'moderately_severe' : score >= 10 ? 'moderate' : score >= 5 ? 'mild' : 'minimal';
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  minimal: 'Mínimos',
  mild: 'Leves',
  moderate: 'Moderados',
  moderately_severe: 'Moderadamente graves',
  severe: 'Graves',
};

/** Texto de orientação para cada faixa: acolhedor, sem diagnóstico. */
export const severityGuidance = (severity: Severity): string => {
  switch (severity) {
    case 'minimal':
      return 'Poucos sintomas neste momento. Continue cuidando de você e refaça no próximo mês.';
    case 'mild':
      return 'Alguns sintomas. As práticas do app (respiração, sono, hábitos) ajudam; se piorar ou durar, converse com um psicólogo.';
    case 'moderate':
      return 'Sintomas que merecem atenção. Vale conversar com um psicólogo: no app, você pode agendar uma consulta.';
    case 'moderately_severe':
    case 'severe':
      return 'Sintomas intensos. Recomendamos falar com um profissional de saúde mental logo. Se precisar agora, use o SOS ou ligue para o CVV (188).';
  }
};

/** Faixas que pedem sugestão de consulta. */
export const suggestsProfessional = (severity: Severity) => severity !== 'minimal' && severity !== 'mild';

export const scoreOf = (answers: number[]) => answers.reduce((sum, value) => sum + value, 0);

/** Um mês entre um questionário e outro, como no acompanhamento clínico. */
export const RETAKE_DAYS = 28;

export const daysSince = (iso: string, now: Date = new Date()) => Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000);

/** Questionários com mais de 28 dias (ou nunca respondidos). */
export const dueInstruments = (history: Pick<Screening, 'instrument' | 'created_at'>[], now: Date = new Date()): Instrument[] =>
  (['gad7', 'phq9'] as Instrument[]).filter((instrument) => {
    const last = history.filter((s) => s.instrument === instrument).sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    return !last || daysSince(last.created_at, now) >= RETAKE_DAYS;
  });

/** Mudança desde o anterior: queda de 5 pontos ou mais é considerada melhora relevante. */
export const changeSincePrevious = (current: Screening, history: Screening[]): { delta: number; meaningful: boolean } | null => {
  const previous = history
    .filter((s) => s.instrument === current.instrument && s.created_at < current.created_at)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  if (!previous) return null;
  const delta = current.score - previous.score;
  return { delta, meaningful: Math.abs(delta) >= 5 };
};
