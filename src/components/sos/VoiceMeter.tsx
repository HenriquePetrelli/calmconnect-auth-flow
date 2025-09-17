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

  const meterWidth = size === 'large' ? 'w-24' : 'w-16';
  const barWidth = size === 'large' ? 'w-1.5' : 'w-1';

  return (
    <div className={`flex items-center gap-2 ${meterWidth}`}>
      <div className={`flex items-end gap-0.5 ${containerHeight} flex-1 justify-center`}>
        {[...Array(barCount)].map((_, i) => {
          const barThreshold = ((i + 1) / barCount) * 100;
          const isBarActive = level >= barThreshold;
          
          // Smoother height calculation with exponential curve
          let barHeight = '3px'; // Minimum visible height
          if (isBarActive) {
            const normalizedLevel = Math.min(100, Math.max(0, level));
            const barPosition = (i + 1) / barCount;
            
            // Exponential curve for more natural visualization
            const curve = Math.pow(normalizedLevel / 100, 0.8);
            const targetHeight = curve * 100;
            const barFactor = Math.pow(barPosition, 0.6);
            
            const calculatedHeight = targetHeight * barFactor;
            barHeight = `${Math.max(3, Math.min(calculatedHeight, 100))}%`;
          }
          
          // Enhanced color mapping with smooth transitions
          let barColor = 'bg-border opacity-50';
          let glowClass = '';
          
          if (isBarActive) {
            const intensity = Math.min(100, level) / 100;
            if (i < barCount * 0.6) {
              // Green zone - good levels
              barColor = 'bg-success';
              glowClass = intensity > 0.7 ? 'shadow-success shadow-sm' : '';
            } else if (i < barCount * 0.85) {
              // Yellow zone - moderate levels
              barColor = 'bg-warning';
              glowClass = intensity > 0.8 ? 'shadow-warning shadow-sm' : '';
            } else {
              // Red zone - high levels
              barColor = 'bg-destructive';
              glowClass = intensity > 0.9 ? 'shadow-destructive shadow-sm' : '';
            }
          }
          
          return (
            <div
              key={i}
              className={`${barWidth} transition-all duration-100 ease-out rounded-full ${barColor} ${glowClass}`}
              style={{ 
                height: barHeight,
                minHeight: '3px'
              }}
            />
          );
        })}
      </div>
      
      {label && (
        <span className="text-xs text-muted-foreground font-medium ml-1">{label}</span>
      )}
    </div>
  );
}