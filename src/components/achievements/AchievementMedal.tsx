import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { achievementIcon, achievementTheme } from './achievementIcons';

interface AchievementMedalProps {
  icon: string;
  achieved: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES = {
  sm: { box: 'h-11 w-11', icon: 'h-5 w-5', lock: 'h-4 w-4 -bottom-0.5 -right-0.5 p-0.5' },
  md: { box: 'h-16 w-16', icon: 'h-7 w-7', lock: 'h-6 w-6 -bottom-1 -right-1 p-1' },
  lg: { box: 'h-20 w-20', icon: 'h-9 w-9', lock: 'h-7 w-7 -bottom-1 -right-1 p-1.5' },
};

/** Medalha redonda: colorida e com brilho quando desbloqueada; cinza e com cadeado quando não. */
const AchievementMedal = ({ icon, achieved, size = 'md', className }: AchievementMedalProps) => {
  const Icon = achievementIcon(icon);
  const theme = achievementTheme(icon);
  const s = SIZES[size];

  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      <span
        className={cn(
          'relative flex items-center justify-center overflow-hidden rounded-full',
          s.box,
          achieved ? 'shadow-md ring-4 ring-white/70 dark:ring-white/10' : 'border-2 border-dashed border-muted-foreground/30 bg-muted',
        )}
        style={achieved ? { backgroundImage: `linear-gradient(135deg, ${theme.from}, ${theme.to})`, boxShadow: `0 6px 16px -6px ${theme.to}` } : undefined}
      >
        <Icon className={cn(s.icon, achieved ? 'text-white drop-shadow-sm' : 'text-muted-foreground/50')} aria-hidden="true" />
        {achieved && <span className="medal-shine pointer-events-none absolute inset-0" aria-hidden="true" />}
      </span>
      {!achieved && (
        <span className={cn('absolute rounded-full bg-card text-muted-foreground shadow-sm ring-1 ring-border', s.lock)}>
          <Lock className="h-full w-full" aria-hidden="true" />
        </span>
      )}
    </span>
  );
};

export default AchievementMedal;
