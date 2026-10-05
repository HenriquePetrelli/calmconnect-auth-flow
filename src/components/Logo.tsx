import logoImg from '@/assets/soliv-logo.webp';
import { cn } from '@/lib/utils';

type LogoVariant = 'full' | 'icon' | 'compact';
type LogoTheme = 'light' | 'dark' | 'auto';

interface LogoProps {
  className?: string;
  variant?: LogoVariant;
  theme?: LogoTheme;
  /** Hide the wordmark text (only the SVG mark is shown). */
  iconOnly?: boolean;
}

const sizeByVariant: Record<LogoVariant, string> = {
  full: 'h-16',
  compact: 'h-10',
  icon: 'h-8 w-8',
};

const Logo = ({
  className = '',
  variant = 'full',
  theme = 'auto',
  iconOnly,
}: LogoProps) => {
  const showWordmark = !iconOnly && variant !== 'icon';

  // For dark theme on light bg or vice-versa we apply a small filter to keep
  // contrast safe. The brand SVG already carries its own colors, but on dark
  // surfaces we softly brighten it.
  const themeFilter =
    theme === 'dark'
      ? 'drop-shadow-[0_0_0_hsl(var(--primary-foreground))]'
      : '';

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center gap-2 text-center',
        className,
      )}
    >
      <h1 className="sr-only">Soliv</h1>
      <img
        src={logoImg}
        alt="Soliv — bem-estar emocional"
        className={cn(
          sizeByVariant[variant],
          'w-auto animate-fade-in select-none',
          themeFilter,
        )}
        loading="eager"
        decoding="async"
        draggable={false}
      />
      {showWordmark && variant === 'full' && (
        <span className="sr-only">Soliv</span>
      )}
    </div>
  );
};

export default Logo;
