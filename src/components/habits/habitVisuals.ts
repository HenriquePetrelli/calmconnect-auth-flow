import { Ban, CigaretteOff, Coffee, Droplets, Footprints, Moon, Pill, Smartphone, Smile, UtensilsCrossed, WineOff, type LucideIcon } from 'lucide-react';
import type { HabitKind } from '@/lib/habits';

// Cor e ícone de cada hábito. Tons com contraste suficiente sobre o fundo claro
// e o escuro; o texto sobre o ícone é sempre branco.
export const HABIT_VISUALS: Record<HabitKind, { icon: LucideIcon; color: string; soft: string }> = {
  water: { icon: Droplets, color: 'hsl(199 89% 42%)', soft: 'hsl(199 89% 42% / 0.12)' },
  sleep: { icon: Moon, color: 'hsl(245 58% 55%)', soft: 'hsl(245 58% 55% / 0.12)' },
  movement: { icon: Footprints, color: 'hsl(158 64% 36%)', soft: 'hsl(158 64% 36% / 0.12)' },
  caffeine: { icon: Coffee, color: 'hsl(25 55% 38%)', soft: 'hsl(25 55% 38% / 0.12)' },
  meals: { icon: UtensilsCrossed, color: 'hsl(38 85% 40%)', soft: 'hsl(38 85% 40% / 0.12)' },
  medication: { icon: Pill, color: 'hsl(190 70% 34%)', soft: 'hsl(190 70% 34% / 0.12)' },
  screen_time: { icon: Smartphone, color: 'hsl(215 30% 40%)', soft: 'hsl(215 30% 40% / 0.12)' },
  joy: { icon: Smile, color: 'hsl(320 60% 46%)', soft: 'hsl(320 60% 46% / 0.12)' },
  quit_smoking: { icon: CigaretteOff, color: 'hsl(25 90% 45%)', soft: 'hsl(25 90% 45% / 0.12)' },
  quit_alcohol: { icon: WineOff, color: 'hsl(340 70% 48%)', soft: 'hsl(340 70% 48% / 0.12)' },
  quit_custom: { icon: Ban, color: 'hsl(262 60% 52%)', soft: 'hsl(262 60% 52% / 0.12)' },
};

/** Cor de alerta quando um hábito de limite passa do limite. */
export const OVER_LIMIT_COLOR = 'hsl(0 72% 46%)';
