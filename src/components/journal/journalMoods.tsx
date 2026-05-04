import React from 'react';
import { CloudRain, Frown, Meh, Heart, Smile, Laugh } from 'lucide-react';

export interface JournalMoodOption {
  value: number;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  bgClass: string;
  borderClass: string;
}

export const JOURNAL_MOODS: JournalMoodOption[] = [
  { value: 0, label: 'Muito triste', Icon: CloudRain, colorClass: 'text-red-600',     bgClass: 'bg-red-50 dark:bg-red-950/30',       borderClass: 'border-red-500' },
  { value: 1, label: 'Triste',       Icon: Frown,     colorClass: 'text-orange-600',  bgClass: 'bg-orange-50 dark:bg-orange-950/30', borderClass: 'border-orange-500' },
  { value: 2, label: 'Neutro',       Icon: Meh,       colorClass: 'text-yellow-600',  bgClass: 'bg-yellow-50 dark:bg-yellow-950/30', borderClass: 'border-yellow-500' },
  { value: 3, label: 'Bem',          Icon: Heart,     colorClass: 'text-blue-600',    bgClass: 'bg-blue-50 dark:bg-blue-950/30',     borderClass: 'border-blue-500' },
  { value: 4, label: 'Feliz',        Icon: Smile,     colorClass: 'text-green-600',   bgClass: 'bg-green-50 dark:bg-green-950/30',   borderClass: 'border-green-500' },
  { value: 5, label: 'Muito feliz',  Icon: Laugh,     colorClass: 'text-emerald-600', bgClass: 'bg-emerald-50 dark:bg-emerald-950/30', borderClass: 'border-emerald-500' },
];

export const getJournalMood = (value: number) => JOURNAL_MOODS[value] ?? JOURNAL_MOODS[2];
