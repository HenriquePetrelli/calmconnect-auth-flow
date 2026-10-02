export const SINTOMAS = [
  'Preocupação excessiva e incontrolável',
  'Inquietação ou sensação de nervosismo',
  'Fadiga fácil',
  'Dificuldade de concentração ou mente em branco',
  'Irritabilidade',
  'Tensão muscular',
  'Perturbação do sono (dificuldade para dormir ou sono inquieto)',
  'Palpitações ou coração acelerado',
  'Sudorese',
  'Tremores ou abalos',
  'Sensação de falta de ar ou asfixia',
  'Dor ou desconforto no peito',
  'Náusea ou desconforto abdominal',
  'Tontura ou sensação de desmaio',
  'Calafrios ou ondas de calor',
  'Formigamento (parestesias)',
  'Sensação de irrealidade (desrealização) ou de distanciamento de si (despersonalização)',
  'Medo de perder o controle ou enlouquecer',
  'Medo de morrer',
  'Medo intenso de situações sociais ou de desempenho',
  'Medo de ser julgado, humilhado ou envergonhado',
  'Ansiedade extrema ao interagir com estranhos',
  'Evitação de situações sociais (reuniões, festas, falar em público)',
  'Ansiedade antecipatória antes de eventos sociais',
  'Medo irracional e excessivo de um objeto ou situação específica (alturas, animais, sangue, etc.)',
  'Resposta de ansiedade imediata ao encontrar o objeto do medo',
  'Evitação ativa do objeto ou situação temida',
  'Reconhecimento de que o medo é excessivo (em adultos)',
  'Ansiedade excessiva ao se separar de figuras de apego',
  'Preocupação com perda ou dano às figuras de apego',
  'Relutância ou recusa em sair de casa (para escola, trabalho)',
  'Medo excessivo de ficar sozinho',
  'Pesadelos sobre separação',
  'Sintomas físicos ao se separar (dores de cabeça, barriga, náusea)',
  'Revivência do trauma (flashbacks, pesadelos, memórias intrusivas)',
  'Evitação de lembretes do trauma (pensamentos, lugares, conversas)',
  'Pensamentos e humor negativos (culpa, medo, raiva, vergonha)',
  'Hiper-reatividade (irritabilidade, hipervigilância, susto fácil, problemas de sono)',
  'Obsessões: Pensamentos, impulsos ou imagens intrusivos e indesejados (medo de contaminação, dúvidas, pensamentos tabu)',
  'Compulsões: Comportamentos ou actos mentais repetitivos (lavar, verificar, organizar, contar) para reduzir a ansiedade',
  'Sintomas de ansiedade durante ou após o uso de substâncias (álcool, cafeína, cannabis, etc.)',
  'Sintomas de ansiedade durante a abstinência de substâncias',
  'Ataques de pânico ou crises de ansiedade durante a noite',
  'Dificuldade em adormecer devido a preocupações',
  'Despertar noturno com angústia ou apreensão',
  'Pensamentos catastróficos ao deitar ou acordar',
  'Preocupação excessiva sobre um evento ou situação futura',
  '"Catastrofização" (prever o pior resultado possível)',
  'Sintomas físicos de ansiedade ao pensar no futuro',
  'Evitação de planejamento ou pensamento sobre o futuro',
  'Sintomas de ansiedade persistentes (preocupação, tensão, nervosismo)',
  'Sintomas depressivos persistentes (humor deprimido, falta de prazer, falta de energia)',
  'Sofrimento clinicamente significativo / Prejuízo no funcionamento social, profissional ou outras áreas importantes'
] as const;

export type Sintoma = typeof SINTOMAS[number];

/**
 * Os sintomas em grupos, para a escolha no cadastro: 53 itens soltos numa
 * lista eram difíceis de percorrer. Cada sintoma está em exatamente um grupo
 * (testado em src/test/sintomas.test.ts).
 */
const grupo = (titulo: string, indices: number[]) => ({ titulo, itens: indices.map((i) => SINTOMAS[i]) as Sintoma[] });

export const SINTOMA_GRUPOS = [
  grupo('Ansiedade e preocupação', [0, 1, 2, 3, 4, 5, 50]),
  grupo('Corpo e crises de pânico', [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]),
  grupo('Sono', [6, 42, 43, 44, 45]),
  grupo('Preocupação com o futuro', [46, 47, 48, 49]),
  grupo('Situações sociais', [19, 20, 21, 22, 23]),
  grupo('Medos específicos', [24, 25, 26, 27]),
  grupo('Separação de pessoas próximas', [28, 29, 30, 31, 32, 33]),
  grupo('Trauma', [34, 35, 36, 37]),
  grupo('Pensamentos e rituais repetitivos', [38, 39]),
  grupo('Humor, substâncias e impacto na rotina', [51, 40, 41, 52]),
];
