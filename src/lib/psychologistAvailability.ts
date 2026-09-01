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

/** Segunda-feira (00:00) da semana que contém `date`, como "YYYY-MM-DD". */
export const getWeekStartISO = (date: Date): string => {
  const day = date.getDay(); // 0=domingo .. 6=sábado
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() + diffToMonday);
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, '0');
  const d = String(monday.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/** As 7 datas (segunda a domingo) da semana que começa em `weekStartISO`. */
export const weekDatesFrom = (weekStartISO: string): string[] => {
  const [y, m, d] = weekStartISO.split('-').map(Number);
  return Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(y, m - 1, d + i);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  });
};

export type OverrideType = 'bloqueio' | 'abertura';

export interface AvailabilityOverride extends EditableBlock {
  type: OverrideType;
}

/** Remove a faixa `blocked` de dentro de `ranges`, truncando ou dividindo os
 * blocos afetados conforme necessário. Blocos sem sobreposição não mudam. */
const subtractRange = (ranges: EditableBlock[], blocked: EditableBlock): EditableBlock[] => {
  const result: EditableBlock[] = [];
  for (const r of ranges) {
    const noOverlap = blocked.end_time <= r.start_time || blocked.start_time >= r.end_time;
    if (noOverlap) {
      result.push(r);
      continue;
    }
    if (blocked.start_time > r.start_time) {
      result.push({ start_time: r.start_time, end_time: blocked.start_time });
    }
    if (blocked.end_time < r.end_time) {
      result.push({ start_time: blocked.end_time, end_time: r.end_time });
    }
  }
  return result;
};

/**
 * Combina o horário-padrão (recorrente) de um dia com as exceções pontuais
 * cadastradas para uma data específica.
 *
 * 'bloqueio' subtrai do horário-padrão (pode truncar ou dividir um bloco em
 * dois). 'abertura' adiciona uma faixa extra, fora do padrão. Um bloqueio só
 * afeta o horário-padrão, nunca uma abertura já existente na mesma data —
 * para reduzir uma abertura, edite/exclua essa exceção diretamente.
 */
export const applyOverridesToDayBlocks = (
  baseBlocks: EditableBlock[],
  overrides: AvailabilityOverride[]
): EditableBlock[] => {
  let ranges = [...baseBlocks];
  for (const o of overrides) {
    if (o.type === 'bloqueio') ranges = subtractRange(ranges, o);
  }
  for (const o of overrides) {
    if (o.type === 'abertura') ranges = [...ranges, { start_time: o.start_time, end_time: o.end_time }];
  }
  return ranges.sort((a, b) => a.start_time.localeCompare(b.start_time));
};

export const HALF_HOUR_STEP_MIN = 30;

export const timeToMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

export const minutesToTime = (minutes: number): string =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

/** Início do próximo slot de meia hora a partir de `time`. */
export const addHalfHour = (time: string): string => minutesToTime(timeToMinutes(time) + HALF_HOUR_STEP_MIN);

/**
 * Todos os horários de início de meia em meia hora que cabem inteiramente
 * dentro de [start, end) — a grade usada para bloquear horários pontuais
 * ("Personalizar horários"). Ex.: 08:00–16:00 -> 08:00, 08:30, ..., 15:30.
 */
export const halfHourGridSlots = (start: string, end: string): string[] => {
  if (!start || !end || start >= end) return [];
  const slots: string[] = [];
  for (let m = timeToMinutes(start); m + HALF_HOUR_STEP_MIN <= timeToMinutes(end); m += HALF_HOUR_STEP_MIN) {
    slots.push(minutesToTime(m));
  }
  return slots;
};
