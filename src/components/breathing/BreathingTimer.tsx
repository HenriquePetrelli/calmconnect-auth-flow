import { Wind, Heart, Waves, Pause as PauseIcon } from "lucide-react";
import { BreathingPattern } from "./BreathingPatterns";
import type { BreathingPhaseState } from "@/hooks/useBreathingPhase";

interface BreathingTimerProps {
  pattern: BreathingPattern;
  state: BreathingPhaseState;
}

type Phase = 'inhale' | 'hold' | 'exhale' | 'pause';

const phaseMeta: Record<Phase, { label: string; color: string; icon: JSX.Element }> = {
  inhale: { label: 'Inspirar', color: 'hsl(var(--primary))', icon: <Wind className="w-4 h-4" /> },
  hold:   { label: 'Segurar', color: 'hsl(var(--secondary))', icon: <Heart className="w-4 h-4" /> },
  exhale: { label: 'Expirar', color: 'hsl(var(--primary))', icon: <Waves className="w-4 h-4" /> },
  pause:  { label: 'Pausa',   color: 'hsl(var(--muted-foreground))', icon: <PauseIcon className="w-4 h-4" /> },
};

const BreathingTimer = ({ pattern, state }: BreathingTimerProps) => {
  const { phase: currentPhase, progress } = state;

  const segments = (['inhale', 'hold', 'exhale', 'pause'] as Phase[])
    .filter((p) => pattern[p] > 0);
  const totalDuration = segments.reduce((sum, p) => sum + pattern[p], 0);

  return (
    <div className="w-full max-w-md mx-auto space-y-3">
      {/* Segmented progress bar */}
      <div className="flex gap-1.5 w-full">
        {segments.map((p) => {
          const widthPct = (pattern[p] / totalDuration) * 100;
          const isCurrent = p === currentPhase;
          const isPast = segments.indexOf(p) < segments.indexOf(currentPhase);
          const fillPct = isCurrent ? progress * 100 : isPast ? 100 : 0;
          return (
            <div
              key={p}
              className="relative h-1.5 rounded-full overflow-hidden bg-muted/70"
              style={{ width: `${widthPct}%` }}
            >
              <div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  width: `${fillPct}%`,
                  backgroundColor: phaseMeta[p].color,
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Phase labels under segments */}
      <div className="flex gap-1.5 w-full">
        {segments.map((p) => {
          const widthPct = (pattern[p] / totalDuration) * 100;
          const isCurrent = p === currentPhase;
          return (
            <div key={p} className="text-center" style={{ width: `${widthPct}%` }}>
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.12em] truncate transition-colors"
                style={{
                  color: isCurrent ? phaseMeta[p].color : 'hsl(var(--muted-foreground) / 0.7)',
                }}
              >
                {phaseMeta[p].label}
              </p>
              <p
                className="text-[11px] font-medium tabular-nums transition-colors"
                style={{
                  color: isCurrent ? phaseMeta[p].color : 'hsl(var(--muted-foreground) / 0.5)',
                }}
              >
                {pattern[p]}s
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BreathingTimer;
