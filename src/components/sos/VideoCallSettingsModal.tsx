import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Settings, Mic, Camera, Eye } from 'lucide-react';

interface VideoCallSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  localStream: MediaStream | null;
}

export const VideoCallSettingsModal = ({ isOpen, onClose, localStream }: VideoCallSettingsModalProps) => {
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState('');
  const [selectedVideoDevice, setSelectedVideoDevice] = useState('');
  const [isBackgroundBlurEnabled, setIsBackgroundBlurEnabled] = useState(false);
  const [currentStream, setCurrentStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadDevices();
      setCurrentStream(localStream);
    }
  }, [isOpen, localStream]);

  const loadDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      const videoInputs = devices.filter(device => device.kind === 'videoinput');
      
      setAudioDevices(audioInputs);
      setVideoDevices(videoInputs);
      
      // Set current devices as default selected
      if (localStream) {
        const audioTrack = localStream.getAudioTracks()[0];
        const videoTrack = localStream.getVideoTracks()[0];
        
        if (audioTrack) {
          const audioSettings = audioTrack.getSettings();
          const deviceId = audioSettings.deviceId || '';
          setSelectedAudioDevice(deviceId);
        }
        
        if (videoTrack) {
          const videoSettings = videoTrack.getSettings();
          const deviceId = videoSettings.deviceId || '';
          setSelectedVideoDevice(deviceId);
        }
      } else {
        // Set first available devices as default if no stream
        if (audioInputs.length > 0) {
          setSelectedAudioDevice(audioInputs[0].deviceId);
        }
        if (videoInputs.length > 0) {
          setSelectedVideoDevice(videoInputs[0].deviceId);
        }
      }
    } catch (error) {
      console.error('Error loading devices:', error);
    }
  };

  const handleAudioDeviceChange = async (deviceId: string) => {
    try {
      setSelectedAudioDevice(deviceId);
      
      if (currentStream) {
        // Stop current audio track
        const audioTrack = currentStream.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.stop();
        }

        // Get new audio stream with selected device
        const newAudioStream = await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: { exact: deviceId } }
        });

        // Replace audio track in current stream
        const newAudioTrack = newAudioStream.getAudioTracks()[0];
        if (newAudioTrack) {
          currentStream.removeTrack(audioTrack);
          currentStream.addTrack(newAudioTrack);
        }
      }
    } catch (error) {
      console.error('Error switching audio device:', error);
    }
  };

  const handleVideoDeviceChange = async (deviceId: string) => {
    try {
      setSelectedVideoDevice(deviceId);
      
      if (currentStream) {
        // Stop current video track
        const videoTrack = currentStream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.stop();
        }

        // Get new video stream with selected device
        const newVideoStream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: deviceId } }
        });

        // Replace video track in current stream
        const newVideoTrack = newVideoStream.getVideoTracks()[0];
        if (newVideoTrack) {
          currentStream.removeTrack(videoTrack);
          currentStream.addTrack(newVideoTrack);
        }
      }
    } catch (error) {
      console.error('Error switching video device:', error);
    }
  };

  const toggleBackgroundBlur = async (enabled: boolean) => {
    setIsBackgroundBlurEnabled(enabled);
    
    if (currentStream) {
      const videoTrack = currentStream.getVideoTracks()[0];
      if (videoTrack && 'applyConstraints' in videoTrack) {
        try {
          // Apply blur effect using browser's built-in background blur if available
          await videoTrack.applyConstraints({
            // @ts-ignore - backgroundBlur is experimental
            backgroundBlur: enabled
          });
        } catch (error) {
          console.warn('Background blur not supported by this browser:', error);
          // Fallback: Apply CSS filter blur to video element
          if (enabled) {
            const videoElements = document.querySelectorAll('video[autoplay]');
            videoElements.forEach((video) => {
              if (video !== document.querySelector('video[ref*="remote"]')) {
                (video as HTMLVideoElement).style.filter = 'blur(5px) brightness(0.8)';
              }
            });
          } else {
            const videoElements = document.querySelectorAll('video[autoplay]');
            videoElements.forEach((video) => {
              if (video !== document.querySelector('video[ref*="remote"]')) {
                (video as HTMLVideoElement).style.filter = 'none';
              }
            });
          }
        }
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#202124] border-gray-600 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Settings className="w-5 h-5" />
            Configurações da chamada
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Audio Device Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium text-gray-200">
              <Mic className="w-4 h-4" />
              Microfone
            </Label>
            <Select value={selectedAudioDevice} onValueChange={handleAudioDeviceChange}>
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Selecionar microfone" />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                {audioDevices.map((device) => (
                  <SelectItem 
                    key={device.deviceId} 
                    value={device.deviceId}
                    className="text-white hover:bg-gray-600"
                  >
                    {device.label || `Microfone ${device.deviceId.slice(0, 8)}...`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Video Device Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium text-gray-200">
              <Camera className="w-4 h-4" />
              Câmera
            </Label>
            <Select value={selectedVideoDevice} onValueChange={handleVideoDeviceChange}>
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Selecionar câmera" />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                {videoDevices.map((device) => (
                  <SelectItem 
                    key={device.deviceId} 
                    value={device.deviceId}
                    className="text-white hover:bg-gray-600"
                  >
                    {device.label || `Câmera ${device.deviceId.slice(0, 8)}...`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Background Blur */}
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2 text-sm font-medium text-gray-200">
              <Eye className="w-4 h-4" />
              Desfocar fundo
            </Label>
            <Switch 
              checked={isBackgroundBlurEnabled}
              onCheckedChange={toggleBackgroundBlur}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};