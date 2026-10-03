import {
  BarChart3,
  CalendarCheck,
  Flag,
  Headphones,
  Leaf,
  Lightbulb,
  MessageCircle,
  Music2,
  NotebookPen,
  PartyPopper,
  Pill,
  ClipboardList,
  ShieldCheck,
  Sprout,
  Trophy,
  User as UserIcon,
  Wind,
  Flame,
  type LucideIcon,
} from 'lucide-react';

/** Ícone de cada conquista (a coluna `icon` guarda a chave). */
export const ACHIEVEMENT_ICONS: Record<string, LucideIcon> = {
  undraw_meditation: UserIcon,
  undraw_yoga: Wind,
  undraw_note_list: NotebookPen,
  undraw_chat: MessageCircle,
  undraw_profile_data: BarChart3,
  undraw_celebration: PartyPopper,
  undraw_music: Music2,
  undraw_headphones: Headphones,
  habit_first: Sprout,
  habit_streak: Flame,
  habit_medication: Pill,
  habit_quit_week: ShieldCheck,
  habit_quit_month: Trophy,
  challenge_done: Flag,
  weekly_all: CalendarCheck,
  screening_both: ClipboardList,
  mindful_eating: Leaf,
  insight_first: Lightbulb,
};

export const achievementIcon = (key: string): LucideIcon => ACHIEVEMENT_ICONS[key] ?? Trophy;

export interface AchievementTheme {
  /** Gradiente da medalha desbloqueada. */
  from: string;
  to: string;
  /** Fundo suave do cartão desbloqueado. */
  soft: string;
}

/** Grupos da tela de conquistas, na ordem em que aparecem, cada um com a sua cor. */
export const ACHIEVEMENT_GROUPS: { title: string; emoji: string; icons: string[]; theme: AchievementTheme }[] = [
  {
    title: 'Respiração e sons',
    emoji: '🌬️',
    icons: ['undraw_meditation', 'undraw_yoga', 'undraw_music', 'undraw_headphones', 'mindful_eating'],
    theme: { from: '#22D3EE', to: '#0EA5E9', soft: 'rgba(14, 165, 233, 0.10)' },
  },
  {
    title: 'Hábitos',
    emoji: '🌱',
    icons: ['habit_first', 'habit_streak', 'habit_medication', 'habit_quit_week', 'habit_quit_month'],
    theme: { from: '#34D399', to: '#059669', soft: 'rgba(16, 185, 129, 0.10)' },
  },
  {
    title: 'Metas e desafios',
    emoji: '🔥',
    icons: ['weekly_all', 'challenge_done', 'undraw_celebration'],
    theme: { from: '#FDBA74', to: '#F97316', soft: 'rgba(249, 115, 22, 0.10)' },
  },
  {
    title: 'Autoconhecimento',
    emoji: '💡',
    icons: ['undraw_profile_data', 'undraw_note_list', 'screening_both', 'insight_first'],
    theme: { from: '#C4B5FD', to: '#7C3AED', soft: 'rgba(124, 58, 237, 0.10)' },
  },
  {
    title: 'Terapia',
    emoji: '💬',
    icons: ['undraw_chat'],
    theme: { from: '#F9A8D4', to: '#DB2777', soft: 'rgba(219, 39, 119, 0.10)' },
  },
];

const DEFAULT_THEME: AchievementTheme = { from: '#FDE68A', to: '#F59E0B', soft: 'rgba(245, 158, 11, 0.10)' };

export const achievementTheme = (icon: string): AchievementTheme =>
  ACHIEVEMENT_GROUPS.find((g) => g.icons.includes(icon))?.theme ?? DEFAULT_THEME;
