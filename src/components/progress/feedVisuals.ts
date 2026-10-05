import {
  Activity,
  BookOpen,
  CalendarCheck,
  ClipboardList,
  Flag,
  Leaf,
  Music,
  RotateCcw,
  Smile,
  Users,
  Wind,
  type LucideIcon,
} from 'lucide-react';
import { HABIT_VISUALS } from '@/components/habits/habitVisuals';
import type { FeedIcon } from '@/lib/activityFeed';
import LifeRingIcon from '@/components/icons/LifeRingIcon';

const PRIMARY = { color: 'hsl(var(--primary))', soft: 'hsl(var(--primary) / 0.1)' };

const ACTIVITY_VISUALS: Record<string, { icon: LucideIcon; color: string; soft: string }> = {
  breathing: { icon: Wind, ...PRIMARY },
  sound: { icon: Music, ...PRIMARY },
  journal: { icon: BookOpen, ...PRIMARY },
  group: { icon: Users, ...PRIMARY },
  appointment: { icon: CalendarCheck, ...PRIMARY },
  sos: { icon: LifeRingIcon, color: 'hsl(var(--destructive))', soft: 'hsl(var(--destructive) / 0.1)' },
  mood: { icon: Smile, ...PRIMARY },
  mindful: { icon: Leaf, ...PRIMARY },
  challenge: { icon: Flag, ...PRIMARY },
  questionnaire: { icon: ClipboardList, ...PRIMARY },
  craving: { icon: Wind, color: 'hsl(25 90% 45%)', soft: 'hsl(25 90% 45% / 0.12)' },
  relapse: { icon: RotateCcw, color: 'hsl(25 90% 45%)', soft: 'hsl(25 90% 45% / 0.12)' },
  other: { icon: Activity, ...PRIMARY },
};

/** Ícone e cores de um item do histórico (hábitos usam as cores de Meus hábitos). */
export const feedVisual = (icon: FeedIcon) =>
  (HABIT_VISUALS as Record<string, { icon: LucideIcon; color: string; soft: string }>)[icon] ?? ACTIVITY_VISUALS[icon] ?? ACTIVITY_VISUALS.other;
