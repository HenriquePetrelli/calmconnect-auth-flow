/** day_of_week: 0 = domingo ... 6 = sábado (mesma convenção da coluna no banco). */
export const DAY_LABELS: Record<number, string> = {
  0: 'Domingo',
  1: 'Segunda-feira',
  2: 'Terça-feira',
  3: 'Quarta-feira',
  4: 'Quinta-feira',
  5: 'Sexta-feira',
  6: 'Sábado',
};

/** Ordem de exibição amigável: semana útil primeiro, domingo por último. */
export const DAYS_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export interface EditableBlock {
  start_time: string;
  end_time: string;
}

/** Valida os blocos de um único dia: horários preenchidos, início antes do fim, sem sobreposição. */
export const validateDayBlocks = (blocks: EditableBlock[]): string | null => {
  for (const b of blocks) {
    if (!b.start_time || !b.end_time) return 'Preencha os horários de início e término';
    if (b.start_time >= b.end_time) return 'O horário de início deve ser antes do término';
  }

  const sorted = [...blocks].sort((a, b) => a.start_time.localeCompare(b.start_time));
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].start_time < sorted[i - 1].end_time) {
      return 'Há horários sobrepostos neste dia';
    }
  }

  return null;
};
