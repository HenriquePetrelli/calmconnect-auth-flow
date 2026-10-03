import { motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import AchievementMedal from './AchievementMedal';
import { achievementTheme } from './achievementIcons';

export interface CelebratedAchievement {
  title: string;
  description: string;
  icon: string;
}

const PARTICLES = 22;
const PHRASES = ['Mandou bem!', 'Que orgulho!', 'Isso aí!', 'Arrasou!', 'Continue assim!'];

/** Toast animado: a medalha "salta", confetes estouram em volta e o texto entra logo depois. */
const AchievementToast = ({ achievement, onClose }: { achievement: CelebratedAchievement; onClose: () => void }) => {
  const reduce = useReducedMotion();
  const theme = achievementTheme(achievement.icon);
  const phrase = PHRASES[achievement.title.length % PHRASES.length];
  const colors = [theme.from, theme.to, '#FACC15', '#F97316', '#7C3AED'];

  return (
    <div
      role="status"
      aria-live="polite"
      className="relative flex w-[min(92vw,380px)] items-center gap-4 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-xl"
      style={{ backgroundImage: `linear-gradient(135deg, ${theme.soft}, transparent 70%)` }}
    >
      <div className="relative">
        {!reduce &&
          Array.from({ length: PARTICLES }, (_, i) => {
            const angle = (i / PARTICLES) * Math.PI * 2;
            const distance = 46 + (i % 4) * 12;
            const round = i % 3 === 0;
            return (
              <motion.span
                key={i}
                aria-hidden="true"
                className={cn('absolute left-1/2 top-1/2 z-10', round ? 'h-2 w-2 rounded-full' : 'h-3 w-1.5 rounded-[2px]')}
                style={{ backgroundColor: colors[i % colors.length], marginLeft: -4, marginTop: -6 }}
                initial={{ x: 0, y: 0, opacity: 1, scale: 0.4, rotate: 0 }}
                animate={{
                  x: Math.cos(angle) * distance,
                  y: [0, Math.sin(angle) * distance, Math.sin(angle) * distance + 14],
                  opacity: [1, 1, 0],
                  scale: 1,
                  rotate: i % 2 ? 260 : -260,
                }}
                transition={{ duration: 1.3, delay: 0.12, ease: 'easeOut' }}
              />
            );
          })}
        {!reduce && (
          <motion.span
            aria-hidden="true"
            className="absolute inset-0 rounded-full"
            style={{ backgroundColor: theme.to }}
            initial={{ scale: 1, opacity: 0.45 }}
            animate={{ scale: 1.9, opacity: 0 }}
            transition={{ duration: 1.1, delay: 0.1, repeat: 1, repeatDelay: 0.4, ease: 'easeOut' }}
          />
        )}
        <motion.div
          className="relative"
          initial={reduce ? false : { scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 14 }}
        >
          <AchievementMedal icon={achievement.icon} achieved size="md" />
        </motion.div>
      </div>

      <motion.div
        className="min-w-0 flex-1"
        initial={reduce ? false : { opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
      >
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: theme.to }}>
          Conquista desbloqueada · {phrase}
        </p>
        <p className="mt-0.5 break-words text-base font-bold text-foreground">{achievement.title}</p>
        <p className="break-words text-sm text-muted-foreground">{achievement.description}</p>
      </motion.div>

      <button
        type="button"
        onClick={onClose}
        className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground hover:bg-muted"
        aria-label="Fechar"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default AchievementToast;
