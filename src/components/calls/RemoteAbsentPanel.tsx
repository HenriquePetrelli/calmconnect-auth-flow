import type { ReactNode } from 'react';
import { Loader2, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface RemoteAbsentAction {
  label: string;
  icon?: LucideIcon;
  onClick?: () => void;
  /** Link (ex.: tel:188) em vez de ação. */
  href?: string;
  variant?: 'default' | 'outline' | 'ghost';
  loading?: boolean;
}

interface RemoteAbsentPanelProps {
  icon: LucideIcon;
  title: string;
  description: ReactNode;
  actions: RemoteAbsentAction[];
}

/**
 * Aparece na chamada quando o outro lado some por mais tempo do que uma queda
 * comum: explica o que está acontecendo e dá uma saída, para ninguém ficar
 * preso esperando sem saber se a consulta ou o SOS vai acontecer.
 */
const RemoteAbsentPanel = ({ icon: Icon, title, description, actions }: RemoteAbsentPanelProps) => (
  <div
    data-testid="remote-absent-panel"
    role="alertdialog"
    aria-labelledby="remote-absent-title"
    className="absolute inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-2xl border border-border bg-card p-4 text-left shadow-lg"
  >
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
        <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
      </div>
      <div className="min-w-0 space-y-1">
        <h2 id="remote-absent-title" className="text-base font-semibold text-foreground">
          {title}
        </h2>
        <div className="text-sm text-muted-foreground">{description}</div>
      </div>
    </div>
    <div className="mt-4 flex flex-col gap-2">
      {actions.map(({ label, icon: ActionIcon, onClick, href, variant = 'outline', loading }) => {
        const content = (
          <>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            ) : (
              ActionIcon && <ActionIcon className="h-4 w-4" aria-hidden="true" />
            )}
            {label}
          </>
        );
        return href ? (
          <Button key={label} asChild variant={variant} className="h-11 w-full gap-2">
            <a href={href}>{content}</a>
          </Button>
        ) : (
          <Button key={label} variant={variant} className="h-11 w-full gap-2" onClick={onClick} disabled={loading}>
            {content}
          </Button>
        );
      })}
    </div>
  </div>
);

export default RemoteAbsentPanel;
