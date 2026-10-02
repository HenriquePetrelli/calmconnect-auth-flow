// Comer com atenção (mindful eating): exercício guiado de cerca de 3 minutos,
// sem regras sobre o que ou quanto comer. Baseado nas práticas descritas em
// programas de alimentação consciente (como o MB-EAT, de Jean Kristeller).

export interface GuidedStep {
  title: string;
  text: string;
  seconds: number;
}

export const MINDFUL_EATING_STEPS: GuidedStep[] = [
  {
    title: 'Prepare-se',
    text: 'Sente-se com calma. Deixe o celular de lado (depois deste exercício) e olhe para o seu prato.',
    seconds: 20,
  },
  { title: 'Respire', text: 'Respire fundo três vezes, devagar. Solte os ombros.', seconds: 20 },
  {
    title: 'Fome de 0 a 10',
    text: 'Antes de começar: de 0 a 10, quanta fome você sente agora? Só perceba, sem julgar.',
    seconds: 15,
  },
  { title: 'Olhe', text: 'Repare nas cores, nas formas e nas texturas da comida, como se fosse a primeira vez.', seconds: 20 },
  { title: 'Sinta o cheiro', text: 'Aproxime o prato ou um pedaço da comida e perceba o aroma.', seconds: 15 },
  {
    title: 'A primeira garfada',
    text: 'Coloque um pedaço na boca e mastigue devagar, sem pressa de engolir. Perceba o sabor e a textura mudando.',
    seconds: 40,
  },
  {
    title: 'Pause entre as garfadas',
    text: 'Pouse o talher entre uma garfada e outra. Se vierem pensamentos, tudo bem: volte a atenção para a comida.',
    seconds: 40,
  },
  {
    title: 'Perceba o corpo',
    text: 'Como está a fome agora? Continue comendo com essa atenção e pare quando se sentir satisfeito(a), não cheio(a).',
    seconds: 20,
  },
];

export const totalSeconds = (steps: GuidedStep[]) => steps.reduce((sum, step) => sum + step.seconds, 0);

/** Em que passo está, dado o tempo decorrido. */
export const stepAt = (steps: GuidedStep[], elapsed: number): { index: number; remaining: number } => {
  let start = 0;
  for (let index = 0; index < steps.length; index++) {
    const end = start + steps[index].seconds;
    if (elapsed < end) return { index, remaining: end - elapsed };
    start = end;
  }
  return { index: steps.length, remaining: 0 };
};

/** Tempo decorrido no início de um passo. */
export const startOfStep = (steps: GuidedStep[], index: number) =>
  steps.slice(0, Math.max(0, index)).reduce((sum, step) => sum + step.seconds, 0);
