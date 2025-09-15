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

      const dataArray = new Uint8Array(analyser.fftSize);

      const updateLevel = () => {
        if (!analyser) return;
        
        analyser.getByteTimeDomainData(dataArray);
        
        // Calcular RMS
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const v = (dataArray[i] - 128) / 128;
          sum += v * v;
        }
        
        const rms = Math.sqrt(sum / dataArray.length);
        // Converter para decibéis
        const db = 20 * Math.log10(rms || 1e-8);
        
        // Normalizar para 0-100 (de -60dB a 0dB)
        const normalizedLevel = Math.max(0, Math.min(100, (db + 60) / 60 * 100));
        
        setLevel(normalizedLevel);
        setIsActive(normalizedLevel > 15); // Threshold para considerar "falando"
        
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

  const barCount = size === 'large' ? 10 : 5;
  const barWidth = size === 'large' ? 'w-1.5' : 'w-1';
  const containerHeight = size === 'large' ? 'h-8' : 'h-6';

  return (
    <div className={`flex items-center gap-2 ${size === 'large' ? 'w-24' : 'w-16'}`}>
      <div className={`flex space-x-0.5 ${containerHeight} items-end`}>
        {[...Array(barCount)].map((_, i) => {
          const barThreshold = (i + 1) * (100 / barCount);
          const isBarActive = level >= barThreshold;
          const barHeight = isBarActive ? `${Math.min(100, (level - barThreshold + (100 / barCount)) / (100 / barCount) * 100)}%` : '4px';
          
          return (
            <div
              key={i}
              className={`${barWidth} transition-all duration-100 ease-out rounded-sm ${
                isBarActive 
                  ? i < barCount * 0.6 ? 'bg-green-500' : 
                    i < barCount * 0.8 ? 'bg-yellow-500' : 'bg-red-500'
                  : 'bg-gray-600'
              }`}
              style={{ height: barHeight }}
            />
          );
        })}
      </div>
      
      {/* Indicador de atividade */}
      <div className={`w-2 h-2 rounded-full transition-all duration-200 ${
        isActive ? 'bg-green-400 shadow-green-400/50 shadow-md' : 'bg-gray-600'
      }`} />
      
      {label && (
        <span className="text-xs text-gray-400 ml-1">{label}</span>
      )}
    </div>
  );
}