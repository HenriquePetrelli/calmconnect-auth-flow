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
  /** Cor sólida da medalha desbloqueada. */
  color: string;
  /** Fundo suave do cartão desbloqueado. */
  soft: string;
}

/** Grupos da tela de conquistas, na ordem em que aparecem, cada um com a sua cor. */
export const ACHIEVEMENT_GROUPS: { title: string; icon: LucideIcon; icons: string[]; theme: AchievementTheme }[] = [
  {
    title: 'Respiração e sons',
    icon: Wind,
    icons: ['undraw_meditation', 'undraw_yoga', 'undraw_music', 'undraw_headphones', 'mindful_eating'],
    theme: { color: '#0EA5E9', soft: 'rgba(14, 165, 233, 0.08)' },
  },
  {
    title: 'Hábitos',
    icon: Sprout,
    icons: ['habit_first', 'habit_streak', 'habit_medication', 'habit_quit_week', 'habit_quit_month'],
    theme: { color: '#10B981', soft: 'rgba(16, 185, 129, 0.08)' },
  },
  {
    title: 'Metas e desafios',
    icon: Flag,
    icons: ['weekly_all', 'challenge_done', 'undraw_celebration'],
    theme: { color: '#F97316', soft: 'rgba(249, 115, 22, 0.08)' },
  },
  {
    title: 'Autoconhecimento',
    icon: Lightbulb,
    icons: ['undraw_profile_data', 'undraw_note_list', 'screening_both', 'insight_first'],
    theme: { color: '#7C3AED', soft: 'rgba(124, 58, 237, 0.08)' },
  },
  {
    title: 'Terapia',
    icon: MessageCircle,
    icons: ['undraw_chat'],
    theme: { color: '#DB2777', soft: 'rgba(219, 39, 119, 0.08)' },
  },
];

const DEFAULT_THEME: AchievementTheme = { color: '#7C3AED', soft: 'rgba(124, 58, 237, 0.08)' };

export const achievementTheme = (icon: string): AchievementTheme =>
  ACHIEVEMENT_GROUPS.find((g) => g.icons.includes(icon))?.theme ?? DEFAULT_THEME;
