export const SPECIALIZATIONS = [
  'Psicologia Clínica',
  'Psicologia Organizacional',
  'Psicologia Escolar',
  'Neuropsicologia',
  'Psicologia Social',
  'Psicologia Hospitalar',
  'Psicologia do Esporte',
  'Psicologia Jurídica',
  'Psicanálise',
  'Terapia Cognitivo-Comportamental',
  'Gestalt-terapia',
  'Psicoterapia Humanística',
  'Outras'
] as const;

export type Specialization = typeof SPECIALIZATIONS[number];
