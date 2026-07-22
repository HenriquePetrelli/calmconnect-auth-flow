import { Switch } from '@/components/ui/switch';
import { usePsychologistPresence } from '@/hooks/usePsychologistPresence';
import { cn } from '@/lib/utils';

interface OnlineStatusToggleProps {
  /** Compact pill variant, ideal for headers/navbars */
  compact?: boolean;
  className?: string;
}

export const OnlineStatusToggle = ({ compact = true, className }: OnlineStatusToggleProps) => {
  const { isOnline, loading, toggle } = usePsychologistPresence();

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-full bg-white/10 hover:bg-white/15 transition-colors',
          'px-2.5 py-1 sm:px-3 sm:py-1.5 border border-white/15',
          className,
        )}
      >
        <span
          className={cn(
            'inline-block w-2 h-2 rounded-full shrink-0',
            isOnline ? 'bg-emerald-400 shadow-[0_0_0_3px_rgba(52,211,153,0.25)]' : 'bg-white/40',
          )}
          aria-hidden
        />
        <span className="hidden sm:inline text-xs font-medium text-white/90">
          {loading ? '...' : isOnline ? 'Online' : 'Offline'}
        </span>
        <Switch
          checked={isOnline}
          onCheckedChange={toggle}
          disabled={loading}
          aria-label="Alternar disponibilidade"
          className="scale-75 sm:scale-90 data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-white/25"
        />
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-3 p-4 border border-border rounded-lg bg-card', className)}>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground">Status de Disponibilidade</p>
        <p className="text-sm text-muted-foreground">
          {isOnline ? 'Visível para pacientes' : 'Não visível para pacientes'}
        </p>
      </div>
      <Switch checked={isOnline} onCheckedChange={toggle} disabled={loading} />
      <span className={cn('w-20 text-sm font-medium', isOnline ? 'text-primary' : 'text-muted-foreground')}>
        {loading ? '...' : isOnline ? 'Online' : 'Offline'}
      </span>
    </div>
  );
};

export default OnlineStatusToggle;
