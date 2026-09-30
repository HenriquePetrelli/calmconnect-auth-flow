import { Ban, CigaretteOff, Droplets, Footprints, Moon, WineOff, type LucideIcon } from 'lucide-react';
import type { HabitKind } from '@/lib/habits';

// Cor e ícone de cada hábito. Tons com contraste suficiente sobre o fundo claro
// e o escuro; o texto sobre o ícone é sempre branco.
export const HABIT_VISUALS: Record<HabitKind, { icon: LucideIcon; color: string; soft: string }> = {
  water: { icon: Droplets, color: 'hsl(199 89% 42%)', soft: 'hsl(199 89% 42% / 0.12)' },
  sleep: { icon: Moon, color: 'hsl(245 58% 55%)', soft: 'hsl(245 58% 55% / 0.12)' },
  movement: { icon: Footprints, color: 'hsl(158 64% 36%)', soft: 'hsl(158 64% 36% / 0.12)' },
  quit_smoking: { icon: CigaretteOff, color: 'hsl(25 90% 45%)', soft: 'hsl(25 90% 45% / 0.12)' },
  quit_alcohol: { icon: WineOff, color: 'hsl(340 70% 48%)', soft: 'hsl(340 70% 48% / 0.12)' },
  quit_custom: { icon: Ban, color: 'hsl(262 60% 52%)', soft: 'hsl(262 60% 52% / 0.12)' },
};
