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

/** Grupos da tela de conquistas, na ordem em que aparecem. */
export const ACHIEVEMENT_GROUPS: { title: string; icons: string[] }[] = [
  { title: 'Respiração e sons', icons: ['undraw_meditation', 'undraw_yoga', 'undraw_music', 'undraw_headphones', 'mindful_eating'] },
  { title: 'Hábitos', icons: ['habit_first', 'habit_streak', 'habit_medication', 'habit_quit_week', 'habit_quit_month'] },
  { title: 'Metas e desafios', icons: ['weekly_all', 'challenge_done', 'undraw_celebration'] },
  { title: 'Autoconhecimento', icons: ['undraw_profile_data', 'undraw_note_list', 'screening_both', 'insight_first'] },
  { title: 'Terapia', icons: ['undraw_chat'] },
];
