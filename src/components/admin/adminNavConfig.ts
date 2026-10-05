import {
  Building2,
  CreditCard,
  History,
  LayoutDashboard,
  MessageSquare,
  MessageSquareWarning,
  UserCheck,
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react';
import LifeRingIcon from '@/components/icons/LifeRingIcon';

export type AdminSection =
  | 'overview'
  | 'psychologists'
  | 'patients'
  | 'companies'
  | 'sos'
  | 'chat'
  | 'groups'
  | 'audit'
  | 'payments'
  | 'profile';

export interface AdminNavItem {
  value: AdminSection;
  label: string;
  icon: LucideIcon;
}

/** Menu do admin em grupos: 10 seções soltas eram difíceis de achar. */
export const ADMIN_NAV_GROUPS: { title: string; items: AdminNavItem[] }[] = [
  { title: 'Geral', items: [{ value: 'overview', label: 'Visão geral', icon: LayoutDashboard }] },
  {
    title: 'Pessoas',
    items: [
      { value: 'psychologists', label: 'Psicólogos', icon: UserCheck },
      { value: 'patients', label: 'Pacientes', icon: Users },
      { value: 'companies', label: 'Empresas', icon: Building2 },
    ],
  },
  {
    title: 'Atendimento',
    items: [
      { value: 'sos', label: 'SOS', icon: LifeRingIcon },
      { value: 'chat', label: 'Chat', icon: MessageSquare },
    ],
  },
  {
    title: 'Moderação',
    items: [
      { value: 'groups', label: 'Grupos de apoio', icon: MessageSquareWarning },
      { value: 'audit', label: 'Auditoria', icon: History },
    ],
  },
  { title: 'Financeiro', items: [{ value: 'payments', label: 'Repasses', icon: CreditCard }] },
  { title: 'Conta', items: [{ value: 'profile', label: 'Meu perfil', icon: UserCog }] },
];

export const ADMIN_NAV_ITEMS = ADMIN_NAV_GROUPS.flatMap((group) => group.items);

export const isAdminSection = (value: string | null): value is AdminSection =>
  ADMIN_NAV_ITEMS.some((item) => item.value === value);

export const adminNavGroupOf = (section: AdminSection) =>
  ADMIN_NAV_GROUPS.find((group) => group.items.some((item) => item.value === section))?.title ?? '';
