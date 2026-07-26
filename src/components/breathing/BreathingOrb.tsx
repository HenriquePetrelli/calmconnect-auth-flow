import { useEffect, useRef } from "react";
import type { BreathingPhaseState } from "@/hooks/useBreathingPhase";

interface BreathingOrbProps {
  state: BreathingPhaseState;
  isPlaying: boolean;
}

// Smooth easing — sine ease-in-out feels most breath-like
const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

const PHASE_COLORS: Record<BreathingPhaseState["phase"], string> = {
  inhale: "hsl(var(--secondary))",
  hold: "hsl(var(--secondary))",
  exhale: "hsl(var(--primary))",
  pause: "hsl(var(--muted-foreground))",
};

const PHASE_LABEL: Record<BreathingPhaseState["phase"], string> = {
  inhale: "Inspire",
  hold: "Segure",
  exhale: "Expire",
  pause: "Pausa",
};

/**
 * A dedicated breathing visual driven by the shared phase state.
 * Scale expands smoothly during inhale, holds at max during hold,
 * contracts during exhale, and rests at min during pause.
 */
const BreathingOrb = ({ state, isPlaying }: BreathingOrbProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef(state);
  const playRef = useRef(isPlaying);
  const smoothScaleRef = useRef(0.55);
  const smoothColorRef = useRef({ from: PHASE_COLORS.inhale, to: PHASE_COLORS.inhale, t: 1 });
  const lastPhaseRef = useRef(state.phase);

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { playRef.current = isPlaying; }, [isPlaying]);

  // Color transition when phase changes
  useEffect(() => {
    if (lastPhaseRef.current !== state.phase) {
      smoothColorRef.current = {
        from: PHASE_COLORS[lastPhaseRef.current],
        to: PHASE_COLORS[state.phase],
        t: 0,
      };
      lastPhaseRef.current = state.phase;
    }
  }, [state.phase]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let raf = 0;
    let last = performance.now();

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      const cx = w / 2;
      const cy = h / 2;
      const maxR = Math.min(w, h) / 2 - 8;
      const minScale = 0.55;
      const maxScale = 1.0;

      const s = stateRef.current;
      // Target scale by phase
      let target = minScale;
      if (s.phase === "inhale") {
        target = minScale + (maxScale - minScale) * easeInOutSine(s.progress);
      } else if (s.phase === "hold") {
        target = maxScale;
      } else if (s.phase === "exhale") {
        target = maxScale - (maxScale - minScale) * easeInOutSine(s.progress);
      } else {
        target = minScale;
      }

      // Critically-damped smoothing for silky motion
      const k = 1 - Math.exp(-dt * 8);
      smoothScaleRef.current += (target - smoothScaleRef.current) * k;

      // Color crossfade progression
      smoothColorRef.current.t = Math.min(1, smoothColorRef.current.t + dt * 2.5);
      const color = smoothColorRef.current.t >= 1
        ? smoothColorRef.current.to
        : smoothColorRef.current.to; // canvas gradient uses CSS var, browser resolves current

      ctx.clearRect(0, 0, w, h);

      const scale = smoothScaleRef.current;
      const r = maxR * scale;

      // Outer soft aura — pulses gently even when paused
      const pulse = playRef.current
        ? 1 + Math.sin(now / 900) * 0.02
        : 1 + Math.sin(now / 1400) * 0.01;

      // Layered outer glow rings
      for (let i = 3; i >= 1; i--) {
        const ringR = r * pulse + i * 14;
        const grad = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, ringR);
        grad.addColorStop(0, color.replace("hsl(", "hsla(").replace(")", `, ${0.08 / i})`));
        grad.addColorStop(1, color.replace("hsl(", "hsla(").replace(")", ", 0)"));
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
        ctx.fill();
      }

      // Core orb — radial gradient
      const core = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.3, r * 0.1, cx, cy, r);
      core.addColorStop(0, color.replace("hsl(", "hsla(").replace(")", ", 0.55)"));
      core.addColorStop(0.6, color.replace("hsl(", "hsla(").replace(")", ", 0.28)"));
      core.addColorStop(1, color.replace("hsl(", "hsla(").replace(")", ", 0.05)"));
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(cx, cy, r * pulse, 0, Math.PI * 2);
      ctx.fill();

      // Progress ring — traces the current phase
      ctx.strokeStyle = color.replace("hsl(", "hsla(").replace(")", ", 0.9)");
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + Math.PI * 2 * s.progress;
      ctx.arc(cx, cy, maxR - 2, startAngle, endAngle);
      ctx.stroke();

      // Faint full track
      ctx.strokeStyle = color.replace("hsl(", "hsla(").replace(")", ", 0.12)");
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, maxR - 2, 0, Math.PI * 2);
      ctx.stroke();

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  const remaining = Math.max(1, Math.ceil((state.durationMs - state.elapsedMs) / 1000));
  const color = PHASE_COLORS[state.phase];

  return (
    <div className="relative w-full h-full">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span
          key={state.phase}
          className="text-[11px] font-semibold uppercase tracking-[0.24em] opacity-80 animate-fade-in"
          style={{ color }}
        >
          {PHASE_LABEL[state.phase]}
        </span>
        <span
          className="text-5xl font-light tabular-nums leading-none mt-2 transition-colors"
          style={{ color }}
        >
          {remaining}
        </span>
      </div>
    </div>
  );
};

export default BreathingOrb;
