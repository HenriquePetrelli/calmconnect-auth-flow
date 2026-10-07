import { useEffect, useState } from 'react';

/**
 * Nível de voz de um stream (0 a 1) e se a pessoa está falando agora, para o
 * indicador ao lado do nome (como no Google Meet). Leve: mede a cada 120 ms
 * e só re-renderiza quando o estado "falando" ou o nível arredondado muda.
 */
export function useAudioLevel(stream: MediaStream | null, enabled = true) {
  const [level, setLevel] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  // O áudio do outro lado pode chegar depois do vídeo, no mesmo stream.
  const [tracksVersion, setTracksVersion] = useState(0);

  useEffect(() => {
    if (!stream) return;
    const bump = () => setTracksVersion((v) => v + 1);
    stream.addEventListener('addtrack', bump);
    stream.addEventListener('removetrack', bump);
    return () => {
      stream.removeEventListener('addtrack', bump);
      stream.removeEventListener('removetrack', bump);
    };
  }, [stream]);

  useEffect(() => {
    const track = stream?.getAudioTracks()[0];
    if (!enabled || !stream || !track) {
      setLevel(0);
      setSpeaking(false);
      return;
    }

    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    let context: AudioContext | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    let quietTicks = 0;
    try {
      context = new AudioCtx();
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.6;
      // Só o áudio: um stream só de vídeo não tem o que medir.
      context.createMediaStreamSource(new MediaStream([track])).connect(analyser);
      const data = new Uint8Array(analyser.fftSize);

      timer = setInterval(() => {
        if (context?.state === 'suspended') void context.resume().catch(() => undefined);
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / data.length);
        const next = Math.min(1, rms * 6);
        setLevel((prev) => (Math.abs(prev - next) > 0.05 ? Math.round(next * 20) / 20 : prev));
        // Um pouco de "segura" para o indicador não piscar entre as sílabas.
        if (next > 0.12 && track.enabled) {
          quietTicks = 0;
          setSpeaking(true);
        } else if (++quietTicks > 4) {
          setSpeaking(false);
        }
      }, 120);
    } catch {
      // Sem medidor (navegador sem Web Audio): a chamada segue normalmente.
    }

    return () => {
      if (timer) clearInterval(timer);
      void context?.close().catch(() => undefined);
    };
  }, [stream, enabled, tracksVersion]);

  return { level, speaking };
}
