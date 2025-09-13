import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { UserPreferences } from './useUserPreferences';

interface MediaDeviceManager {
  changeAudioDevice: (deviceId: string, stream: MediaStream | null, peerConnection: RTCPeerConnection | null) => Promise<MediaStream | null>;
  changeVideoDevice: (deviceId: string, stream: MediaStream | null, peerConnection: RTCPeerConnection | null) => Promise<MediaStream | null>;
  changeAudioOutputDevice: (deviceId: string) => Promise<void>;
  applyBackgroundBlur: (enabled: boolean, videoElement: HTMLVideoElement | null) => void;
}

export const useMediaDeviceSettings = (
  localVideoRef: React.RefObject<HTMLVideoElement>,
  onStreamUpdate?: (stream: MediaStream) => void
): MediaDeviceManager => {
  const { toast } = useToast();

  const changeAudioDevice = useCallback(async (
    deviceId: string,
    currentStream: MediaStream | null,
    peerConnection: RTCPeerConnection | null
  ): Promise<MediaStream | null> => {
    try {
      console.log('🎤 Changing audio device to:', deviceId);

      if (!currentStream || !peerConnection) {
        console.warn('No stream or peer connection available');
        return currentStream;
      }

      // Get new audio stream with selected device
      const newAudioStream = await navigator.mediaDevices.getUserMedia({
        audio: { 
          deviceId: { exact: deviceId },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      const newAudioTrack = newAudioStream.getAudioTracks()[0];
      if (!newAudioTrack) {
        throw new Error('No audio track in new stream');
      }

      // Find and replace the audio track in peer connection
      const sender = peerConnection.getSenders().find(s => 
        s.track && s.track.kind === 'audio'
      );

      if (sender) {
        await sender.replaceTrack(newAudioTrack);
        console.log('✅ Audio track replaced in peer connection');
      }

      // Replace audio track in current stream
      const oldAudioTrack = currentStream.getAudioTracks()[0];
      if (oldAudioTrack) {
        currentStream.removeTrack(oldAudioTrack);
        oldAudioTrack.stop();
      }
      currentStream.addTrack(newAudioTrack);

      // Stop the temporary stream (keep only the track we need)
      newAudioStream.getAudioTracks().slice(1).forEach(track => track.stop());

      onStreamUpdate?.(currentStream);
      console.log('✅ Audio device changed successfully');
      
      return currentStream;
    } catch (error) {
      console.error('❌ Error changing audio device:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao alterar dispositivo de áudio',
        variant: 'destructive',
      });
      return currentStream;
    }
  }, [toast, onStreamUpdate]);

  const changeVideoDevice = useCallback(async (
    deviceId: string,
    currentStream: MediaStream | null,
    peerConnection: RTCPeerConnection | null
  ): Promise<MediaStream | null> => {
    try {
      console.log('📷 Changing video device to:', deviceId);

      if (!currentStream || !peerConnection) {
        console.warn('No stream or peer connection available');
        return currentStream;
      }

      // Get new video stream with selected device
      const newVideoStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          deviceId: { exact: deviceId },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
      });

      const newVideoTrack = newVideoStream.getVideoTracks()[0];
      if (!newVideoTrack) {
        throw new Error('No video track in new stream');
      }

      // Find and replace the video track in peer connection
      const sender = peerConnection.getSenders().find(s => 
        s.track && s.track.kind === 'video'
      );

      if (sender) {
        await sender.replaceTrack(newVideoTrack);
        console.log('✅ Video track replaced in peer connection');
      }

      // Replace video track in current stream
      const oldVideoTrack = currentStream.getVideoTracks()[0];
      if (oldVideoTrack) {
        currentStream.removeTrack(oldVideoTrack);
        oldVideoTrack.stop();
      }
      currentStream.addTrack(newVideoTrack);

      // Update local video element
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = currentStream;
      }

      // Stop the temporary stream (keep only the track we need)
      newVideoStream.getVideoTracks().slice(1).forEach(track => track.stop());

      onStreamUpdate?.(currentStream);
      console.log('✅ Video device changed successfully');
      
      return currentStream;
    } catch (error) {
      console.error('❌ Error changing video device:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao alterar dispositivo de vídeo',
        variant: 'destructive',
      });
      return currentStream;
    }
  }, [toast, localVideoRef, onStreamUpdate]);

  const changeAudioOutputDevice = useCallback(async (deviceId: string) => {
    try {
      console.log('🔊 Changing audio output device to:', deviceId);

      // Change audio output for all audio and video elements
      const audioElements = document.querySelectorAll('audio, video');
      const promises = Array.from(audioElements).map(async (element) => {
        const audioElement = element as HTMLAudioElement | HTMLVideoElement;
        if ('setSinkId' in audioElement && typeof audioElement.setSinkId === 'function') {
          try {
            await audioElement.setSinkId(deviceId);
          } catch (error) {
            console.warn('Failed to set sink ID for element:', error);
          }
        }
      });

      await Promise.all(promises);
      console.log('✅ Audio output device changed successfully');
    } catch (error) {
      console.error('❌ Error changing audio output device:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao alterar dispositivo de saída de áudio',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const applyBackgroundBlur = useCallback((enabled: boolean, videoElement: HTMLVideoElement | null) => {
    try {
      console.log(`🖼️ ${enabled ? 'Applying' : 'Removing'} background blur`);

      if (videoElement) {
        if (enabled) {
          videoElement.style.filter = 'blur(3px) brightness(0.9)';
        } else {
          videoElement.style.filter = 'none';
        }
      }

      // Also apply to all local video elements (self-view)
      const localVideoElements = document.querySelectorAll('video[autoplay][muted]');
      localVideoElements.forEach((video) => {
        const videoEl = video as HTMLVideoElement;
        if (enabled) {
          videoEl.style.filter = 'blur(3px) brightness(0.9)';
        } else {
          videoEl.style.filter = 'none';
        }
      });

      console.log('✅ Background blur applied successfully');
    } catch (error) {
      console.error('❌ Error applying background blur:', error);
    }
  }, []);

  return {
    changeAudioDevice,
    changeVideoDevice,
    changeAudioOutputDevice,
    applyBackgroundBlur,
  };
};
