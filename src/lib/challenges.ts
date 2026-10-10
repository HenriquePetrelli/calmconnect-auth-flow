// Desafios de 7 dias: metas da semana com um passo por dia. O banco guarda só
// o desafio (weekly_goals, type 'challenge') e quantos passos foram feitos; o
// texto de cada dia fica aqui.

export interface ChallengeStep {
  title: string;
  text: string;
  /** Atalho para a tela que ajuda no passo. */
  link?: { to: string; label: string };
}

const BREATHING = { to: '/breathing', label: 'Abrir respiração' };
const JOURNAL = { to: '/journal', label: 'Abrir diário' };

export const CHALLENGES: Record<string, ChallengeStep[]> = {
  challenge_sleep: [
    { title: 'Horário fixo para acordar', text: 'Escolha um horário para acordar e mantenha todos os dias desta semana, inclusive no fim de semana.' },
    { title: 'Café só até as 14h', text: 'Hoje, nada de café, energético ou chá preto depois das 14h. A cafeína fica horas no corpo.' },
    { title: 'Uma hora sem tela', text: 'Desligue celular e TV 1 hora antes de deitar. Troque por leitura, banho ou música calma.' },
    { title: 'Quarto para dormir', text: 'Deixe o quarto escuro, fresco e silencioso. Use a cama só para dormir, não para trabalhar ou rolar o feed.' },
    { title: 'Respire antes de dormir', text: 'Já deitado(a), faça alguns minutos da respiração 4-7-8.', link: BREATHING },
    { title: 'Se não dormir, levante', text: 'Se não pegar no sono em uns 20 minutos, levante, faça algo calmo com pouca luz e volte quando der sono.' },
    { title: 'O que funcionou', text: 'Anote no diário o que mais ajudou nesta semana e o que você quer manter.', link: JOURNAL },
  ],
  challenge_breathing: [
    { title: 'Ao acordar', text: 'Comece o dia com 3 minutos de respiração profunda.', link: BREATHING },
    { title: 'Pausa no meio do dia', text: 'Pare 2 minutos no meio do dia e faça a respiração tática (4-4-4).', link: BREATHING },
    { title: 'Antes de dormir', text: 'Faça a respiração 4-7-8 antes de deitar.', link: BREATHING },
    { title: 'Antes de algo difícil', text: 'Antes de uma conversa ou tarefa que te deixa tenso(a), respire devagar por 1 minuto.' },
    { title: '5 minutos completos', text: 'Faça uma sessão de 5 minutos, do começo ao fim, sem pressa.', link: BREATHING },
    { title: 'Respire com sons', text: 'Coloque um som relaxante e respire junto com ele por alguns minutos.', link: { to: '/sounds', label: 'Abrir sons' } },
    { title: 'A sua favorita', text: 'Escolha a técnica de que você mais gostou. Ela é a sua para os momentos difíceis.', link: BREATHING },
  ],
  challenge_gratitude: [
    { title: 'Três coisas boas', text: 'Anote no diário três coisas boas de hoje, mesmo pequenas.', link: JOURNAL },
    { title: 'Alguém que te ajudou', text: 'Escreva sobre uma pessoa que fez diferença na sua vida.', link: JOURNAL },
    { title: 'O seu corpo', text: 'Anote algo que o seu corpo permitiu você fazer hoje.', link: JOURNAL },
    { title: 'Um momento simples', text: 'Um café, um raio de sol, uma música: registre um momento simples que foi bom.', link: JOURNAL },
    { title: 'Diga obrigado(a)', text: 'Agradeça alguém hoje, pessoalmente ou por mensagem.' },
    { title: 'Algo que você superou', text: 'Escreva sobre uma dificuldade que você já superou e o que aprendeu com ela.', link: JOURNAL },
    { title: 'Releia a semana', text: 'Releia o que escreveu nos últimos dias e perceba como você se sente.', link: JOURNAL },
  ],
  challenge_anxiety: [
    {
      title: 'Técnica 5-4-3-2-1',
      text: 'Quando a ansiedade vier, encontre 5 coisas que você vê, 4 que toca, 3 que ouve, 2 que cheira e 1 que saboreia.',
    },
    { title: 'Respiração de emergência', text: 'Conheça a respiração de emergência para usar numa crise.', link: BREATHING },
    {
      title: 'O que está no seu controle',
      text: 'Escreva uma preocupação e separe o que depende de você e o que não depende.',
      link: JOURNAL,
    },
    { title: 'Caminhe 10 minutos', text: 'Uma caminhada curta ajuda o corpo a gastar a tensão.' },
    { title: 'Menos cafeína hoje', text: 'Café e energético aceleram o coração e aumentam a ansiedade. Experimente reduzir hoje.' },
    {
      title: 'Horário da preocupação',
      text: 'Reserve 15 minutos do dia para se preocupar. Fora deles, anote a preocupação e deixe para depois.',
    },
    {
      title: 'Seu plano para crises',
      text: 'Monte ou revise o seu plano de segurança: o que fazer e com quem falar nos momentos difíceis.',
      link: { to: '/safety-plan', label: 'Abrir plano de segurança' },
    },
  ],
  challenge_screen: [
    { title: 'Veja o seu tempo de tela', text: 'Confira no celular quanto tempo você usou ontem. Por enquanto, só observe.' },
    { title: 'Notificações em silêncio', text: 'Desligue as notificações dos 2 apps que mais tiram a sua atenção.' },
    { title: 'Refeições sem celular', text: 'Faça as refeições de hoje sem o celular na mesa.' },
    { title: 'Uma hora offline à noite', text: 'Uma hora antes de dormir, deixe o celular longe da cama.' },
    { title: 'Troque o feed', text: 'Quando der vontade de abrir as redes, faça outra coisa por 5 minutos: alongar, beber água, respirar.' },
    { title: 'Manhã sem tela', text: 'Não pegue o celular nos primeiros 30 minutos do dia.' },
    { title: 'Seus combinados', text: 'Escolha 2 regras desta semana para manter daqui para frente.' },
  ],
};

export const isChallenge = (goal: { type?: string | null; category?: string | null }) =>
  goal.type === 'challenge' || Boolean(goal.category && goal.category in CHALLENGES);

/** O passo de hoje (o próximo ainda não feito). */
export const currentStep = (category: string, progress: number): { index: number; step: ChallengeStep } | null => {
  const steps = CHALLENGES[category];
  if (!steps || progress >= steps.length) return null;
  return { index: progress, step: steps[progress] };
};

const localDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * Já fez o passo hoje? (um passo por dia). Usa o dia gravado pelo servidor no
 * último passo (`last_progress_date`); metas antigas, sem ele, pela hora da
 * última alteração.
 */
export const stepDoneToday = (
  progress: number,
  updatedAt: string,
  now: Date = new Date(),
  lastProgressDate?: string | null,
) =>
  progress > 0 &&
  (lastProgressDate ? lastProgressDate === localDay(now) : new Date(updatedAt).toDateString() === now.toDateString());

/** Dias que faltam na semana (domingo a sábado), contando hoje. */
export const daysLeftInWeek = (now: Date = new Date()) => 7 - now.getDay();
