import { useState, useEffect, useRef } from "react";
import { BreathingPattern } from "./BreathingPatterns";
import { Wind, Heart, Waves, Pause as PauseIcon } from "lucide-react";

interface BreathingTimerProps {
  pattern: BreathingPattern;
  isActive: boolean;
  onPhaseChange?: (phase: 'inhale' | 'hold' | 'exhale' | 'pause') => void;
  onCycleComplete?: () => void;
}

type Phase = 'inhale' | 'hold' | 'exhale' | 'pause';

const phaseMeta: Record<Phase, { label: string; color: string; icon: JSX.Element }> = {
  inhale: { label: 'Inspirar', color: 'hsl(var(--primary))', icon: <Wind className="w-4 h-4" /> },
  hold:   { label: 'Segurar', color: 'hsl(var(--secondary))', icon: <Heart className="w-4 h-4" /> },
  exhale: { label: 'Expirar', color: 'hsl(var(--primary))', icon: <Waves className="w-4 h-4" /> },
  pause:  { label: 'Pausa',   color: 'hsl(var(--muted-foreground))', icon: <PauseIcon className="w-4 h-4" /> },
};

const BreathingTimer = ({ pattern, isActive, onPhaseChange, onCycleComplete }: BreathingTimerProps) => {
  const [currentPhase, setCurrentPhase] = useState<Phase>('inhale');
  const [phaseElapsedMs, setPhaseElapsedMs] = useState(0);
  const phaseStartRef = useRef<number>(performance.now());
  const lastTickRef = useRef<number>(performance.now());

  const getNextPhase = (phase: Phase, pat: BreathingPattern): Phase => {
    switch (phase) {
      case 'inhale': return pat.hold > 0 ? 'hold' : 'exhale';
      case 'hold':   return 'exhale';
      case 'exhale': return pat.pause > 0 ? 'pause' : 'inhale';
      case 'pause':  return 'inhale';
    }
  };

  useEffect(() => {
    setCurrentPhase('inhale');
    setPhaseElapsedMs(0);
    phaseStartRef.current = performance.now();
    lastTickRef.current = performance.now();
  }, [pattern]);

  useEffect(() => {
    if (!isActive) {
      lastTickRef.current = performance.now();
      return;
    }
    phaseStartRef.current = performance.now() - phaseElapsedMs;

    let raf = 0;
    const tick = () => {
      const now = performance.now();
      const elapsed = now - phaseStartRef.current;
      const totalMs = pattern[currentPhase] * 1000;

      if (elapsed >= totalMs) {
        const nextPhase = getNextPhase(currentPhase, pattern);
        setCurrentPhase(nextPhase);
        onPhaseChange?.(nextPhase);
        if (nextPhase === 'inhale') onCycleComplete?.();
        phaseStartRef.current = now;
        setPhaseElapsedMs(0);
      } else {
        setPhaseElapsedMs(elapsed);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isActive, currentPhase, pattern, onPhaseChange, onCycleComplete]);

  const total = pattern[currentPhase];
  const totalMs = total * 1000;
  const progress = totalMs > 0 ? Math.min(1, phaseElapsedMs / totalMs) : 0;
  const remainingTime = Math.max(1, Math.ceil((totalMs - phaseElapsedMs) / 1000));

  const segments = (['inhale', 'hold', 'exhale', 'pause'] as Phase[])
    .filter((p) => pattern[p] > 0);
  const totalDuration = segments.reduce((sum, p) => sum + pattern[p], 0);

  const meta = phaseMeta[currentPhase];

  return (
    <div className="w-full max-w-md mx-auto space-y-3">
      {/* Phase indicator — elegant pill */}
      <div className="flex items-center justify-center gap-3">
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors"
          style={{
            borderColor: `${meta.color.replace('hsl(', 'hsla(').replace(')', ', 0.25)')}`,
            backgroundColor: `${meta.color.replace('hsl(', 'hsla(').replace(')', ', 0.08)')}`,
            color: meta.color,
          }}
        >
          {meta.icon}
          <span className="text-xs font-semibold uppercase tracking-[0.14em]">
            {meta.label}
          </span>
        </div>
        <div className="flex items-baseline gap-1" style={{ color: meta.color }}>
          <span className="text-3xl font-light tabular-nums leading-none">{remainingTime}</span>
          <span className="text-xs font-medium opacity-70">s</span>
        </div>
      </div>

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
                className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-100 ease-linear"
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
