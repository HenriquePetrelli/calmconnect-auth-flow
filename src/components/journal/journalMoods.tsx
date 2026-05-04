import React from 'react';
import { CloudRain, Frown, Meh, Heart, Smile } from 'lucide-react';

export interface JournalMoodOption {
  value: number;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  bgClass: string;
  borderClass: string;
}

// Aligned with MOOD_OPTIONS (registro de humor) — same values, labels, icons and colors.
export const JOURNAL_MOODS: JournalMoodOption[] = [
  { value: 5, label: 'Muito Bem', Icon: Smile,     colorClass: 'text-green-600',  bgClass: 'bg-green-50 dark:bg-green-950/30',   borderClass: 'border-green-500' },
  { value: 4, label: 'Bem',       Icon: Heart,     colorClass: 'text-blue-600',   bgClass: 'bg-blue-50 dark:bg-blue-950/30',     borderClass: 'border-blue-500' },
  { value: 3, label: 'Neutro',    Icon: Meh,       colorClass: 'text-yellow-600', bgClass: 'bg-yellow-50 dark:bg-yellow-950/30', borderClass: 'border-yellow-500' },
  { value: 2, label: 'Mal',       Icon: Frown,     colorClass: 'text-orange-600', bgClass: 'bg-orange-50 dark:bg-orange-950/30', borderClass: 'border-orange-500' },
  { value: 1, label: 'Muito Mal', Icon: CloudRain, colorClass: 'text-red-600',    bgClass: 'bg-red-50 dark:bg-red-950/30',       borderClass: 'border-red-500' },
];

export const DEFAULT_JOURNAL_MOOD = 3; // Neutro

export const getJournalMood = (value: number) =>
  JOURNAL_MOODS.find((m) => m.value === value) ?? JOURNAL_MOODS[2];
