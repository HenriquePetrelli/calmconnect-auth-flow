import { useState, useEffect, useRef } from 'react';

interface AudioLevelMeterProps {
  stream: MediaStream | null;
  threshold?: number;
}

export const useAudioLevelMeter = ({ 
  stream, 
  threshold = -50 // dB threshold for speaking detection
}: AudioLevelMeterProps) => {
  const [audioLevel, setAudioLevel] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    if (!stream) {
      cleanup();
      return;
    }

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      cleanup();
      return;
    }

    try {
      // Create audio context
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      // Create analyser node
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      // Create source from stream
      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;

      // Connect source to analyser
      source.connect(analyser);

      // Start monitoring
      startMonitoring();
    } catch (error) {
      console.error('Error setting up audio level meter:', error);
    }

    return cleanup;
  }, [stream]);

  const startMonitoring = () => {
    if (!analyserRef.current) return;

    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const updateLevel = () => {
      if (!analyser) return;

      analyser.getByteFrequencyData(dataArray);
      
      // Calculate RMS (Root Mean Square) for audio level
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      
      const rms = Math.sqrt(sum / dataArray.length);
      const decibels = 20 * Math.log10(rms / 255);
      
      // Normalize to 0-100 range
      const normalizedLevel = Math.max(0, Math.min(100, (decibels + 100) * 1.25));
      
      setAudioLevel(normalizedLevel);
      setIsSpeaking(decibels > threshold);

      animationFrameRef.current = requestAnimationFrame(updateLevel);
    };

    updateLevel();
  };

  const cleanup = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    analyserRef.current = null;
    setAudioLevel(0);
    setIsSpeaking(false);
  };

  return {
    audioLevel,
    isSpeaking,
    cleanup
  };
};