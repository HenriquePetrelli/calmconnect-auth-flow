import { CalendarCheck, CalendarDays, Home, MessageCircle, User, Wallet, type LucideIcon } from 'lucide-react';

export interface PsychologistNavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  /** Outros endereços que contam como esta aba (ex.: subpáginas). */
  alsoActiveOn?: string[];
}

/**
 * Áreas do psicólogo, na ordem de uso:
 * - Início: ficar online para o SOS, pedidos de SOS e o resumo do dia.
 * - Consultas: pedidos de agendamento, próximas consultas e histórico.
 * - Agenda: horário-padrão, horários da semana, férias e regras.
 * - Chat: conversas com pacientes.
 * - Perfil (celular) / Pagamentos (computador, no menu lateral).
 */
export const PSYCHOLOGIST_HOME = '/psychologist-dashboard';

export const PSYCHOLOGIST_MAIN_NAV: PsychologistNavItem[] = [
  { label: 'Início', path: PSYCHOLOGIST_HOME, icon: Home },
  { label: 'Consultas', path: '/psicologo/consultas', icon: CalendarCheck },
  { label: 'Agenda', path: '/psychologist-availability', icon: CalendarDays },
  { label: 'Chat', path: '/chat', icon: MessageCircle },
];

export const PSYCHOLOGIST_PAYMENTS_NAV: PsychologistNavItem = {
  label: 'Pagamentos',
  path: '/psychologist-payments',
  icon: Wallet,
};

export const PSYCHOLOGIST_PROFILE_NAV: PsychologistNavItem = {
  label: 'Perfil',
  path: '/psychologist-profile',
  icon: User,
  alsoActiveOn: ['/psychologist-payments', '/psicologo/suporte'],
};

export const isNavActive = (item: PsychologistNavItem, pathname: string) =>
  pathname === item.path || (item.alsoActiveOn ?? []).some((path) => pathname.startsWith(path));
