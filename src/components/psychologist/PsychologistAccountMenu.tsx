import { useNavigate } from 'react-router-dom';
import { CalendarCheck, CalendarDays, LogOut, MessageCircle, User, Wallet } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface PsychologistAccountMenuProps {
  name?: string | null;
  onWeeklySchedule: () => void;
  onSignOut: () => void;
}

const initialsOf = (name?: string | null) =>
  (name || 'P')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

/**
 * Menu da conta do psicólogo no cabeçalho: um botão só (a inicial) no lugar de
 * agenda, perfil e sair soltos, que apertavam o cabeçalho no celular e no tablet.
 */
const PsychologistAccountMenu = ({ name, onWeeklySchedule, onSignOut }: PsychologistAccountMenuProps) => {
  const navigate = useNavigate();
  const itemClass = 'min-h-11 gap-3 cursor-pointer';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-sm font-semibold text-white ring-1 ring-white/25 transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          aria-label="Menu da conta"
        >
          {initialsOf(name)}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {name && (
          <>
            <DropdownMenuLabel className="truncate font-medium">{name}</DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem className={itemClass} onClick={() => navigate('/psychologist-profile')}>
          <User className="h-4 w-4 text-primary" /> Meu perfil
        </DropdownMenuItem>
        <DropdownMenuItem className={itemClass} onClick={() => navigate('/psychologist-availability')}>
          <CalendarDays className="h-4 w-4 text-primary" /> Minha agenda
        </DropdownMenuItem>
        <DropdownMenuItem className={itemClass} onClick={onWeeklySchedule}>
          <CalendarCheck className="h-4 w-4 text-primary" /> Confirmar agenda da semana
        </DropdownMenuItem>
        <DropdownMenuItem className={itemClass} onClick={() => navigate('/psychologist-payments')}>
          <Wallet className="h-4 w-4 text-primary" /> Pagamentos
        </DropdownMenuItem>
        <DropdownMenuItem className={itemClass} onClick={() => navigate('/psicologo/suporte')}>
          <MessageCircle className="h-4 w-4 text-primary" /> Suporte
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className={`${itemClass} text-destructive focus:text-destructive`} onClick={onSignOut}>
          <LogOut className="h-4 w-4" /> Sair da conta
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default PsychologistAccountMenu;
