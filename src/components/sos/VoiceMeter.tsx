import { useEffect, useRef, useState } from "react";

interface VoiceMeterProps {
  stream: MediaStream | null;
  size?: 'small' | 'large';
  label?: string;
}

export default function VoiceMeter({ stream, size = 'small', label }: VoiceMeterProps) {
  const [level, setLevel] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafId = useRef<number>();
  // Smoothing refs for more fluid meter
  const prevDbRef = useRef<number>(-60);
  const prevLevelRef = useRef<number>(0);

  useEffect(() => {
    if (!stream) {
      setLevel(0);
      setIsActive(false);
      return;
    }

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      setLevel(0);
      setIsActive(false);
      return;
    }

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.85;
      
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      sourceRef.current = source;

      // Use Float32 for better precision and smoother response
      const dataArray = new Float32Array(analyser.fftSize);

      const updateLevel = () => {
        if (!analyser) return;

        // Prefer Float data if available
        if ((analyser as any).getFloatTimeDomainData) {
          (analyser as any).getFloatTimeDomainData(dataArray);
        } else {
          // Fallback to Byte and convert to Float
          const byteArray = new Uint8Array(analyser.fftSize);
          analyser.getByteTimeDomainData(byteArray);
          for (let i = 0; i < byteArray.length; i++) {
            dataArray[i] = (byteArray[i] - 128) / 128;
          }
        }

        // Compute RMS
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const v = dataArray[i];
          sum += v * v;
        }
        const rms = Math.sqrt(sum / dataArray.length);

        // Convert to dBFS and smooth with EMA
        const instantDb = 20 * Math.log10(rms || 1e-8);
        const alpha = 0.2; // smoothing factor
        const smoothedDb = prevDbRef.current + alpha * (instantDb - prevDbRef.current);
        prevDbRef.current = smoothedDb;

        // Normalize -60dB..0dB => 0..100
        const normalized = Math.max(0, Math.min(100, ((smoothedDb + 60) / 60) * 100));

        // Additional smoothing on level to reduce jitter
        const levelAlpha = 0.3;
        const smoothLevel = prevLevelRef.current + levelAlpha * (normalized - prevLevelRef.current);
        prevLevelRef.current = smoothLevel;

        setLevel(smoothLevel);
        setIsActive(smoothLevel > 15);

        rafId.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();
    } catch (error) {
      console.error('VoiceMeter error:', error);
      setLevel(0);
      setIsActive(false);
    }

    return () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
      
      if (sourceRef.current) {
        try {
          sourceRef.current.disconnect();
        } catch (e) {
          console.warn('Error disconnecting audio source:', e);
        }
      }
      
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      
      audioContextRef.current = null;
      analyserRef.current = null;
      sourceRef.current = null;
    };
  }, [stream]);

  const barCount = size === 'large' ? 12 : 8;
  const containerHeight = size === 'large' ? 'h-10' : 'h-7';

  return (
    <div className={`flex items-center gap-3 ${size === 'large' ? 'w-32' : 'w-20'}`}>
      <div className={`flex items-end gap-0.5 ${containerHeight} px-1`}>
        {[...Array(barCount)].map((_, i) => {
          const barThreshold = (i + 1) * (100 / barCount);
          const isBarActive = level >= barThreshold;
          
          // Calculate height more smoothly
          let barHeight = '2px'; // Minimum height
          if (isBarActive) {
            const heightPercent = Math.min(100, (level / 100) * 100);
            const barFactor = (i + 1) / barCount;
            const adjustedHeight = heightPercent * barFactor;
            barHeight = `${Math.max(2, adjustedHeight)}%`;
          }
          
          // Color mapping using design tokens
          let barColor = 'bg-muted-foreground/40';
          if (isBarActive) {
            if (i < barCount * 0.5) {
              barColor = 'bg-success';
            } else if (i < barCount * 0.8) {
              barColor = 'bg-warning';
            } else {
              barColor = 'bg-destructive';
            }
          }
          
          return (
            <div
              key={i}
              className={`w-1 transition-all duration-75 ease-out rounded-full ${barColor} ${
                isBarActive ? 'shadow-sm' : ''
              }`}
              style={{ height: barHeight }}
            />
          );
        })}
      </div>
      
      {label && (
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
      )}
    </div>
  );
}