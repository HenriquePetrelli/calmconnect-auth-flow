import { useEffect, useRef, useState, useCallback } from "react";

export interface AudioLevels {
  /** Volume normalizado (0..1) */
  volume: number;
  /** Energia dos graves (0..1) */
  bass: number;
  /** Energia dos médios (0..1) */
  mid: number;
  /** Energia dos agudos (0..1) */
  treble: number;
}

interface UseAudioAnalyserOptions {
  /** Habilita/desabilita o analyser (ex.: pausar quando aba inativa) */
  enabled?: boolean;
  /** FFT size — power of 2, entre 32 e 32768 */
  fftSize?: number;
  /** Suavização exponencial (0..1) — quanto maior, mais smooth */
  smoothing?: number;
}

const EMPTY_LEVELS: AudioLevels = { volume: 0, bass: 0, mid: 0, treble: 0 };

/**
 * Conecta um <audio> element a um AnalyserNode via Web Audio API
 * e expõe um ref atualizado a cada frame com volume/bandas de frequência.
 *
 * IMPORTANTE: a leitura é via ref para evitar re-renders no React.
 * Componentes consumidores devem ler `levelsRef.current` dentro de um
 * requestAnimationFrame próprio (Canvas) ou do MotionValue do framer-motion.
 */
export function useAudioAnalyser(
  audioEl: HTMLAudioElement | null,
  options: UseAudioAnalyserOptions = {}
) {
  const { enabled = true, fftSize = 256, smoothing = 0.82 } = options;

  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const dataRef = useRef<Uint8Array | null>(null);
  const rafRef = useRef<number | null>(null);
  const levelsRef = useRef<AudioLevels>({ ...EMPTY_LEVELS });
  const [isReady, setIsReady] = useState(false);

  // Setup do AudioContext + AnalyserNode quando temos o <audio>
  useEffect(() => {
    if (!audioEl) return;

    let cancelled = false;

    const setup = () => {
      if (cancelled) return;
      try {
        if (!ctxRef.current) {
          const AC =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext })
              .webkitAudioContext;
          ctxRef.current = new AC();
        }
        const ctx = ctxRef.current!;

        if (!analyserRef.current) {
          const analyser = ctx.createAnalyser();
          analyser.fftSize = fftSize;
          analyser.smoothingTimeConstant = smoothing;
          analyserRef.current = analyser;
        }

        if (!sourceRef.current) {
          // crossOrigin precisa estar setado ANTES da source ser criada
          // para áudios servidos com CORS apropriado
          if (!audioEl.crossOrigin) audioEl.crossOrigin = "anonymous";
          try {
            const source = ctx.createMediaElementSource(audioEl);
            source.connect(analyserRef.current);
            analyserRef.current.connect(ctx.destination);
            sourceRef.current = source;
          } catch {
            // Já conectado anteriormente — ignora
          }
        }

        dataRef.current = new Uint8Array(
          new ArrayBuffer(analyserRef.current.frequencyBinCount)
        );
        setIsReady(true);
      } catch (err) {
        // Fallback silencioso — animação usará valores zerados
        console.warn("[useAudioAnalyser] setup failed:", err);
        setIsReady(false);
      }
    };

    setup();

    return () => {
      cancelled = true;
    };
  }, [audioEl, fftSize, smoothing]);

  // Resume do contexto quando o áudio começa a tocar
  const resume = useCallback(async () => {
    const ctx = ctxRef.current;
    if (ctx && ctx.state === "suspended") {
      try {
        await ctx.resume();
      } catch {
        /* noop */
      }
    }
  }, []);

  // Loop de leitura — só roda quando enabled
  useEffect(() => {
    if (!enabled || !isReady) {
      levelsRef.current = { ...EMPTY_LEVELS };
      return;
    }

    let last = performance.now();
    const FRAME_MS = 1000 / 30; // limita a ~30fps de leitura

    const tick = (t: number) => {
      rafRef.current = requestAnimationFrame(tick);
      if (t - last < FRAME_MS) return;
      last = t;

      const analyser = analyserRef.current;
      const data = dataRef.current;
      if (!analyser || !data) return;

      analyser.getByteFrequencyData(data);

      const bins = data.length;
      // Divide em 3 bandas: bass (0..1/6), mid (1/6..1/2), treble (1/2..1)
      const bassEnd = Math.floor(bins / 6);
      const midEnd = Math.floor(bins / 2);

      let bassSum = 0;
      let midSum = 0;
      let trebleSum = 0;
      let total = 0;
      for (let i = 0; i < bins; i++) {
        const v = data[i];
        total += v;
        if (i < bassEnd) bassSum += v;
        else if (i < midEnd) midSum += v;
        else trebleSum += v;
      }

      const norm = (sum: number, n: number) => (n > 0 ? sum / (n * 255) : 0);
      const next: AudioLevels = {
        volume: norm(total, bins),
        bass: norm(bassSum, bassEnd),
        mid: norm(midSum, midEnd - bassEnd),
        treble: norm(trebleSum, bins - midEnd),
      };

      // Suavização extra (low-pass) para evitar tremores
      const prev = levelsRef.current;
      const a = 0.35;
      levelsRef.current = {
        volume: prev.volume + (next.volume - prev.volume) * a,
        bass: prev.bass + (next.bass - prev.bass) * a,
        mid: prev.mid + (next.mid - prev.mid) * a,
        treble: prev.treble + (next.treble - prev.treble) * a,
      };
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [enabled, isReady]);

  // Pause do loop quando aba fica inativa
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // Cleanup geral ao desmontar
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      try {
        sourceRef.current?.disconnect();
        analyserRef.current?.disconnect();
      } catch {
        /* noop */
      }
      // Não fechamos o AudioContext aqui pois ele é compartilhado
      // entre montagens do mesmo elemento <audio> — o GC cuida.
    };
  }, []);

  return { levelsRef, isReady, resume };
}
