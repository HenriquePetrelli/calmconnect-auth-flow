import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface ExpandableCardProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Só um ícone simples (20 px) que indique estado — sem caixa colorida. */
  leading?: ReactNode;
  /** Ações no cabeçalho (ex.: "Ocultar"), ao lado da seta. */
  actions?: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  contentClassName?: string;
  titleClassName?: string;
  children: ReactNode;
}

/**
 * Bloco que abre e fecha, no padrão do app (o mesmo do "Registre seu humor"):
 * cartão arredondado, título e subtítulo à esquerda, seta à direita. Use este
 * componente em vez de montar um novo, para todos ficarem iguais.
 */
const ExpandableCard = ({
  title,
  subtitle,
  leading,
  actions,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  className,
  contentClassName,
  titleClassName,
  children,
}: ExpandableCardProps) => {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = (next: boolean) => {
    if (controlledOpen === undefined) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={cn(
        'w-full rounded-2xl border bg-card/80 shadow-sm backdrop-blur-sm transition-colors',
        open ? 'border-border' : 'border-border/70',
        className,
      )}
    >
      <div className="flex w-full items-center gap-2 p-3 sm:gap-3 sm:p-4">
        <CollapsibleTrigger asChild>
          <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left">
            {leading && <span className="flex shrink-0 [&_svg]:h-5 [&_svg]:w-5 sm:[&_svg]:h-6 sm:[&_svg]:w-6">{leading}</span>}
            <span className="min-w-0">
              <span className={cn('block truncate text-sm font-semibold text-foreground sm:text-base', titleClassName)}>{title}</span>
              {subtitle && <span className="block text-xs text-muted-foreground sm:text-sm">{subtitle}</span>}
            </span>
          </button>
        </CollapsibleTrigger>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        <CollapsibleTrigger asChild>
          <button type="button" aria-label={open ? 'Recolher' : 'Expandir'} className="shrink-0 p-1 text-muted-foreground hover:text-foreground">
            <ChevronDown className={cn('h-5 w-5 transition-transform', open && 'rotate-180')} />
          </button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className={cn('px-4 pb-4', contentClassName)}>{children}</CollapsibleContent>
    </Collapsible>
  );
};

export default ExpandableCard;
