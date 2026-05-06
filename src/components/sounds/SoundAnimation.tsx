import { useEffect, useRef } from "react";
import type { AudioLevels } from "@/hooks/useAudioAnalyser";

export type AnimationType =
  | "waves"
  | "rain"
  | "fire"
  | "breathing"
  | "ambient";

interface SoundAnimationProps {
  type: AnimationType;
  isPlaying: boolean;
  /** Ref vivo para os níveis de áudio (não causa re-render) */
  levelsRef: React.MutableRefObject<AudioLevels>;
  /** Renderiza em formato circular com fundo sólido primary */
  circular?: boolean;
}

// Paleta da identidade do app (laranja + roxo)
const COLORS = {
  orange: { r: 249, g: 115, b: 22 }, // #F97316
  purple: { r: 124, g: 58, b: 237 }, // #7C3AED
  purpleDeep: { r: 30, g: 16, b: 58 },
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const SoundAnimation = ({ type, isPlaying, levelsRef }: SoundAnimationProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const stateRef = useRef<{
    particles: Array<Record<string, number>>;
    intensity: number; // suaviza play/pause
    time: number;
  }>({ particles: [], intensity: 0, time: 0 });

  // Setup do canvas + DPR + resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  // Reinicia partículas ao trocar de tipo
  useEffect(() => {
    stateRef.current.particles = [];
  }, [type]);

  // Loop principal
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let last = performance.now();
    const TARGET_FPS = 60;
    const MIN_FRAME = 1000 / TARGET_FPS;

    const draw = (now: number) => {
      rafRef.current = requestAnimationFrame(draw);
      if (document.hidden) return;
      const delta = now - last;
      if (delta < MIN_FRAME) return;
      last = now;
      const dt = Math.min(delta / 16.67, 2); // dt em "frames"

      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      if (w === 0 || h === 0) return;

      // Fade suave entre play/pause
      const target = isPlaying ? 1 : 0;
      stateRef.current.intensity = lerp(
        stateRef.current.intensity,
        target,
        0.05 * dt
      );
      stateRef.current.time += dt * 0.016;

      const levels = levelsRef.current;
      const intensity = stateRef.current.intensity;

      // Background com fade (cria trilha de partículas)
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(15, 8, 30, 0.18)";
      ctx.fillRect(0, 0, w, h);

      switch (type) {
        case "rain":
          drawRain(ctx, w, h, levels, intensity, stateRef.current, dt);
          break;
        case "waves":
          drawWaves(ctx, w, h, levels, intensity, stateRef.current.time);
          break;
        case "fire":
          drawFire(ctx, w, h, levels, intensity, stateRef.current, dt);
          break;
        case "breathing":
          drawBreathing(
            ctx,
            w,
            h,
            levels,
            intensity,
            stateRef.current.time
          );
          break;
        case "ambient":
        default:
          drawAmbient(
            ctx,
            w,
            h,
            levels,
            intensity,
            stateRef.current,
            dt
          );
          break;
      }
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [type, isPlaying, levelsRef]);

  return (
    <div className="relative w-full h-full rounded-[28px] overflow-hidden border border-white/10 shadow-[0_20px_60px_-20px_rgba(124,58,237,0.6)]">
      {/* Fundo gradiente roxo profundo + glass */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 30% 20%, rgba(124,58,237,0.55), transparent 60%), radial-gradient(circle at 70% 80%, rgba(249,115,22,0.35), transparent 55%), linear-gradient(135deg, #1a0d3a 0%, #0f0820 100%)",
        }}
      />
      <canvas
        ref={canvasRef}
        className="relative w-full h-full block"
        aria-hidden
      />
      {/* Glass overlay sutil */}
      <div className="pointer-events-none absolute inset-0 backdrop-blur-[2px] bg-white/[0.02]" />
    </div>
  );
};

export default SoundAnimation;

/* ============================================================
 *  Renderers — cada tipo de animação
 * ============================================================ */

function drawRain(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  levels: AudioLevels,
  intensity: number,
  state: { particles: Array<Record<string, number>> },
  dt: number
) {
  const targetCount = Math.floor(80 + levels.volume * 220 * intensity);
  const particles = state.particles;

  while (particles.length < targetCount) {
    particles.push({
      x: Math.random() * w,
      y: Math.random() * h,
      len: 6 + Math.random() * 14,
      speed: 3 + Math.random() * 6,
      alpha: 0.3 + Math.random() * 0.5,
    });
  }
  if (particles.length > targetCount) particles.length = targetCount;

  const speedMul = 0.5 + intensity * (1 + levels.volume * 2);
  ctx.lineCap = "round";
  for (const p of particles) {
    p.y += p.speed * speedMul * dt;
    p.x += 0.4 * dt;
    if (p.y > h + 10) {
      p.y = -10;
      p.x = Math.random() * w;
    }
    if (p.x > w + 10) p.x = -10;

    const grad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.len);
    grad.addColorStop(0, `rgba(180, 200, 255, 0)`);
    grad.addColorStop(
      1,
      `rgba(200, 220, 255, ${p.alpha * intensity})`
    );
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + 1, p.y + p.len);
    ctx.stroke();
  }

  // Glow central com cor do app
  const cx = w / 2;
  const cy = h / 2;
  const r = 60 + levels.bass * 80 * intensity;
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  glow.addColorStop(0, `rgba(124, 58, 237, ${0.25 * intensity})`);
  glow.addColorStop(1, "rgba(124, 58, 237, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
}

function drawWaves(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  levels: AudioLevels,
  intensity: number,
  time: number
) {
  const layers = 4;
  for (let i = 0; i < layers; i++) {
    const phase = time * (0.6 + i * 0.25);
    const amp = (16 + i * 10) * (0.3 + intensity) * (0.6 + levels.bass * 1.4);
    const yBase = h * (0.55 + i * 0.08);
    const colorMix = i / (layers - 1);
    const r = Math.round(lerp(COLORS.purple.r, COLORS.orange.r, colorMix));
    const g = Math.round(lerp(COLORS.purple.g, COLORS.orange.g, colorMix));
    const b = Math.round(lerp(COLORS.purple.b, COLORS.orange.b, colorMix));
    const alpha = 0.15 + 0.15 * intensity;

    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 6) {
      const y =
        yBase +
        Math.sin(x * 0.012 + phase) * amp +
        Math.sin(x * 0.03 + phase * 1.3) * (amp * 0.4);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();

    const grad = ctx.createLinearGradient(0, yBase - amp, 0, h);
    grad.addColorStop(0, `rgba(${r},${g},${b},${alpha})`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = grad;
    ctx.fill();
  }

  // Reflexo/brilho topo conforme agudos
  const sheen = ctx.createLinearGradient(0, 0, 0, h * 0.4);
  sheen.addColorStop(
    0,
    `rgba(255, 220, 180, ${0.05 + levels.treble * 0.15 * intensity})`
  );
  sheen.addColorStop(1, "rgba(255,220,180,0)");
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, w, h * 0.4);
}

function drawFire(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  levels: AudioLevels,
  intensity: number,
  state: { particles: Array<Record<string, number>> },
  dt: number
) {
  const targetCount = Math.floor(60 + 140 * intensity);
  const particles = state.particles;
  const cx = w / 2;
  const cy = h * 0.6;

  while (particles.length < targetCount) {
    particles.push({
      x: cx + (Math.random() - 0.5) * w * 0.3,
      y: cy + Math.random() * 30,
      vy: -(0.6 + Math.random() * 1.4),
      vx: (Math.random() - 0.5) * 0.6,
      r: 4 + Math.random() * 14,
      life: 0,
      maxLife: 60 + Math.random() * 60,
    });
  }
  if (particles.length > targetCount) particles.length = targetCount;

  ctx.globalCompositeOperation = "lighter";
  for (const p of particles) {
    p.life += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt * (1 + levels.bass * 1.5);
    p.r *= 0.992;

    const t = p.life / p.maxLife;
    if (t >= 1 || p.r < 1) {
      p.x = cx + (Math.random() - 0.5) * w * 0.3;
      p.y = cy + Math.random() * 20;
      p.vy = -(0.6 + Math.random() * 1.4) * (1 + levels.volume);
      p.vx = (Math.random() - 0.5) * 0.6;
      p.r = 4 + Math.random() * 14;
      p.life = 0;
      continue;
    }

    // De laranja → roxo conforme sobe
    const r = Math.round(lerp(COLORS.orange.r, COLORS.purple.r, t));
    const g = Math.round(lerp(COLORS.orange.g, COLORS.purple.g, t));
    const b = Math.round(lerp(COLORS.orange.b, COLORS.purple.b, t));
    const alpha = (1 - t) * 0.6 * intensity;

    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
    grad.addColorStop(0, `rgba(${r},${g},${b},${alpha})`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
}

function drawBreathing(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  levels: AudioLevels,
  intensity: number,
  time: number
) {
  const cx = w / 2;
  const cy = h / 2;
  // Respiração base ~ 5s ciclo, modulada pelo volume
  const breath = (Math.sin(time * 0.6) + 1) / 2; // 0..1
  const baseR = Math.min(w, h) * 0.18;
  const maxAdd = Math.min(w, h) * 0.22;
  const r =
    baseR + maxAdd * (0.3 + 0.7 * breath) * (0.4 + intensity) +
    levels.volume * 30 * intensity;

  // Anéis concêntricos
  for (let i = 5; i >= 1; i--) {
    const rr = r * (1 + i * 0.18);
    const a = (0.06 + 0.04 * intensity) * (1 - i / 6);
    const grad = ctx.createRadialGradient(cx, cy, rr * 0.7, cx, cy, rr);
    grad.addColorStop(0, `rgba(124, 58, 237, ${a})`);
    grad.addColorStop(1, `rgba(124, 58, 237, 0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, rr, 0, Math.PI * 2);
    ctx.fill();
  }

  // Núcleo laranja → roxo
  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  core.addColorStop(0, `rgba(249, 115, 22, ${0.55 * intensity + 0.1})`);
  core.addColorStop(0.6, `rgba(124, 58, 237, ${0.45 * intensity + 0.08})`);
  core.addColorStop(1, "rgba(124, 58, 237, 0)");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Anel fino
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.2 * intensity + 0.05})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
}

function drawAmbient(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  levels: AudioLevels,
  intensity: number,
  state: { particles: Array<Record<string, number>>; time: number },
  dt: number
) {
  // Partículas flutuantes (poeira luminosa)
  const targetCount = 80;
  const particles = state.particles;
  while (particles.length < targetCount) {
    particles.push({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 0.6 + Math.random() * 2.2,
      vx: (Math.random() - 0.5) * 0.2,
      vy: -(0.1 + Math.random() * 0.3),
      hue: Math.random(),
      twinkle: Math.random() * Math.PI * 2,
    });
  }
  if (particles.length > targetCount) particles.length = targetCount;

  ctx.globalCompositeOperation = "lighter";
  for (const p of particles) {
    p.x += p.vx * dt * (1 + levels.mid);
    p.y += p.vy * dt * (1 + levels.bass * 0.5);
    p.twinkle += 0.04 * dt;

    if (p.y < -5) {
      p.y = h + 5;
      p.x = Math.random() * w;
    }
    if (p.x < -5) p.x = w + 5;
    if (p.x > w + 5) p.x = -5;

    const r = Math.round(lerp(COLORS.purple.r, COLORS.orange.r, p.hue));
    const g = Math.round(lerp(COLORS.purple.g, COLORS.orange.g, p.hue));
    const b = Math.round(lerp(COLORS.purple.b, COLORS.orange.b, p.hue));
    const a =
      (0.3 + 0.4 * Math.sin(p.twinkle)) * (0.3 + intensity * 0.7);

    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
    grad.addColorStop(0, `rgba(${r},${g},${b},${a})`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";

  // Aurora suave que pulsa com agudos
  const auroraY = h * 0.35;
  const grad = ctx.createLinearGradient(0, auroraY - 60, 0, auroraY + 80);
  grad.addColorStop(
    0,
    `rgba(124, 58, 237, ${0.0 + levels.treble * 0.25 * intensity})`
  );
  grad.addColorStop(
    0.5,
    `rgba(249, 115, 22, ${0.05 + levels.mid * 0.2 * intensity})`
  );
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, auroraY - 60, w, 140);
}
