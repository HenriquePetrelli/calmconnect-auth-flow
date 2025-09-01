export const TRANSTORNOS = [
  'Transtorno de Ansiedade Generalizada (TAG)',
  'Ataque de Pânico',
  'Ansiedade Social (Fobia Social)',
  'Fobias Específicas',
  'Transtorno de Ansiedade de Separação',
  'Transtorno de Estresse Pós-Traumático (TEPT)',
  'Transtorno Obsessivo-Compulsivo (TOC)',
  'Ansiedade Induzida por Substâncias',
  'Ansiedade Noturna',
  'Ansiedade Antecipatória',
  'Transtorno de Ansiedade Mista com Depressão'
] as const;

export type Transtorno = typeof TRANSTORNOS[number];