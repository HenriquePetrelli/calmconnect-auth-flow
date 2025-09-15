import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Label } from '@/components/ui/label';
import { Settings, Mic, Camera, Volume2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useMediaDeviceSettings } from '@/hooks/useMediaDeviceSettings';

interface VideoCallSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  localStream: MediaStream | null;
  peerConnection?: RTCPeerConnection | null;
  localVideoRef?: React.RefObject<HTMLVideoElement>;
  onStreamUpdate?: (stream: MediaStream) => void;
}

export const VideoCallSettingsModal = ({ 
  isOpen, 
  onClose, 
  localStream, 
  peerConnection = null,
  localVideoRef,
  onStreamUpdate 
}: VideoCallSettingsModalProps) => {
  const { toast } = useToast();
  const { preferences, savePreferences, isLoading: preferencesLoading } = useUserPreferences();
  const mediaDeviceManager = useMediaDeviceSettings(localVideoRef || { current: null }, onStreamUpdate);
  
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState('');
  const [selectedVideoDevice, setSelectedVideoDevice] = useState('');
  const [selectedAudioOutputDevice, setSelectedAudioOutputDevice] = useState('');
  const [tempAudioDevice, setTempAudioDevice] = useState('');
  const [tempVideoDevice, setTempVideoDevice] = useState('');
  const [tempAudioOutputDevice, setTempAudioOutputDevice] = useState('');
  const [currentStream, setCurrentStream] = useState<MediaStream | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadDevices();
      setCurrentStream(localStream);
    }
  }, [isOpen, localStream]);

  // Load saved preferences when modal opens or set current devices
  useEffect(() => {
    if (isOpen && !preferencesLoading) {
      if (preferences) {
        // Use saved preferences if available
        const micId = preferences.mic_device_id || '';
        const cameraId = preferences.camera_device_id || '';
        const speakerId = preferences.speaker_device_id || '';
        
        setSelectedAudioDevice(micId);
        setSelectedVideoDevice(cameraId);
        setSelectedAudioOutputDevice(speakerId);
        setTempAudioDevice(micId);
        setTempVideoDevice(cameraId);
        setTempAudioOutputDevice(speakerId);
      } else {
        // Detect current devices from the stream
        if (localStream) {
          const audioTrack = localStream.getAudioTracks()[0];
          const videoTrack = localStream.getVideoTracks()[0];
          
          let micId = '';
          let cameraId = '';
          
          if (audioTrack) {
            const audioSettings = audioTrack.getSettings();
            if (audioSettings.deviceId) {
              micId = audioSettings.deviceId;
            }
          }
          
          if (videoTrack) {
            const videoSettings = videoTrack.getSettings();
            if (videoSettings.deviceId) {
              cameraId = videoSettings.deviceId;
            }
          }
          
          setSelectedAudioDevice(micId);
          setSelectedVideoDevice(cameraId);
          setTempAudioDevice(micId);
          setTempVideoDevice(cameraId);
        }
      }
    }
  }, [isOpen, preferencesLoading, preferences, localStream]);

  const loadDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      const videoInputs = devices.filter(device => device.kind === 'videoinput');
      const audioOutputs = devices.filter(device => device.kind === 'audiooutput');
      
      setAudioDevices(audioInputs);
      setVideoDevices(videoInputs);
      setAudioOutputDevices(audioOutputs);
      
      // Set first available devices as fallback if no current device detected
      if (!selectedAudioDevice && audioInputs.length > 0) {
        setSelectedAudioDevice(audioInputs[0].deviceId);
      }
      if (!selectedVideoDevice && videoInputs.length > 0) {
        setSelectedVideoDevice(videoInputs[0].deviceId);
      }
      if (!selectedAudioOutputDevice && audioOutputs.length > 0) {
        setSelectedAudioOutputDevice(audioOutputs[0].deviceId);
      }
    } catch (error) {
      console.error('Error loading devices:', error);
    }
  };

  const handleAudioDeviceChange = (deviceId: string) => {
    setTempAudioDevice(deviceId);
  };

  const handleVideoDeviceChange = (deviceId: string) => {
    setTempVideoDevice(deviceId);
  };

  const handleAudioOutputDeviceChange = (deviceId: string) => {
    setTempAudioOutputDevice(deviceId);
  };

  const handleCancel = () => {
    // Reset temp values to original values
    setTempAudioDevice(selectedAudioDevice);
    setTempVideoDevice(selectedVideoDevice);
    setTempAudioOutputDevice(selectedAudioOutputDevice);
    onClose();
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    
    try {
      // Validate selected devices exist
      const audioValid = !tempAudioDevice || audioDevices.some(d => d.deviceId === tempAudioDevice);
      const videoValid = !tempVideoDevice || videoDevices.some(d => d.deviceId === tempVideoDevice);
      const outputValid = !tempAudioOutputDevice || audioOutputDevices.some(d => d.deviceId === tempAudioOutputDevice);

      const safeMicId = audioValid ? tempAudioDevice : null;
      const safeCamId = videoValid ? tempVideoDevice : null;
      const safeSpeakerId = outputValid ? tempAudioOutputDevice : null;

      if (!audioValid || !videoValid || !outputValid) {
        toast({
          title: 'Dispositivo inválido',
          description: 'Alguns dispositivos selecionados não estão disponíveis. Aplicando valores padrão.',
          variant: 'destructive',
        });
      }

      // Apply changes in real time to current call
      let updatedStream = currentStream || localStream;
      if (safeMicId && updatedStream) {
        updatedStream = await mediaDeviceManager.changeAudioDevice(safeMicId, updatedStream, peerConnection || null);
      }
      if (safeCamId && updatedStream) {
        updatedStream = await mediaDeviceManager.changeVideoDevice(safeCamId, updatedStream, peerConnection || null);
      }
      if (safeSpeakerId) {
        await mediaDeviceManager.changeAudioOutputDevice(safeSpeakerId);
      }
      
      // Update stream and notify parent
      if (updatedStream && onStreamUpdate) {
        onStreamUpdate(updatedStream);
        setCurrentStream(updatedStream);
      }

      // Update the actual selected values
      setSelectedAudioDevice(safeMicId || '');
      setSelectedVideoDevice(safeCamId || '');
      setSelectedAudioOutputDevice(safeSpeakerId || '');

      // Persist to Supabase
      const success = await savePreferences({
        mic_device_id: safeMicId || null,
        camera_device_id: safeCamId || null,
        speaker_device_id: safeSpeakerId || null,
      });

      if (success) {
        toast({
          title: 'Configurações salvas',
          description: 'Suas configurações foram aplicadas e salvas com sucesso.',
        });
        onClose();
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
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
            <Select value={tempAudioDevice} onValueChange={handleAudioDeviceChange}>
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Selecionar microfone" />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600 z-50">
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
            <Select value={tempVideoDevice} onValueChange={handleVideoDeviceChange}>
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Selecionar câmera" />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600 z-50">
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

          {/* Audio Output Device Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium text-gray-200">
              <Volume2 className="w-4 h-4" />
              Alto-falante
            </Label>
            <Select value={tempAudioOutputDevice} onValueChange={handleAudioOutputDeviceChange}>
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Selecionar alto-falante" />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600 z-50">
                {audioOutputDevices.map((device) => (
                  <SelectItem 
                    key={device.deviceId} 
                    value={device.deviceId}
                    className="text-white hover:bg-gray-600"
                  >
                    {device.label || `Alto-falante ${device.deviceId.slice(0, 8)}...`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button 
            variant="outline" 
            onClick={handleCancel}
            className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSaveSettings}
            disabled={isSaving || preferencesLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};