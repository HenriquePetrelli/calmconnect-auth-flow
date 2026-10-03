import type { ReactNode } from 'react';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * Padrão das seções de Meu Progresso: o mesmo cabeçalho (ícone em caixa
 * roxa clara, título e subtítulo) e o mesmo cartão em todas.
 */
export const ProgressSection = ({
  icon: Icon,
  title,
  subtitle,
  action,
  children,
  className,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) => (
  <Card className={cn('overflow-hidden', className)}>
    <CardHeader className="pb-3">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
    </CardHeader>
    <CardContent className="pt-0">{children}</CardContent>
  </Card>
);

/** Atalho do topo de Meu Progresso: mesmo tamanho e visual para todos. */
export const ProgressTile = ({
  icon: Icon,
  title,
  subtitle,
  onClick,
  badge,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  onClick?: () => void;
  /** Bolinha de "pendente" (ex.: questionário do mês). */
  badge?: boolean;
}) => {
  const body = (
    <>
      <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
        <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
        {badge && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-card" aria-label="Pendente" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold leading-tight text-foreground">{title}</span>
        <span className="block break-words text-sm text-muted-foreground">{subtitle}</span>
      </span>
      {onClick && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
    </>
  );
  const className = 'flex h-full w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-sm';
  return onClick ? (
    <button type="button" onClick={onClick} className={cn(className, 'transition-colors hover:bg-muted/40')}>
      {body}
    </button>
  ) : (
    <div className={className}>{body}</div>
  );
};
