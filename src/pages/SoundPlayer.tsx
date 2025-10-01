import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Play, Pause, SkipBack, SkipForward } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { soundsData } from "@/data/soundsData";
import AnimationSelector from "@/components/sounds/AnimationSelector";
import SoundAnimation from "@/components/sounds/SoundAnimation";

const SoundPlayer = () => {
  const navigate = useNavigate();
  const { soundId, playlistId } = useParams<{ soundId: string; playlistId?: string }>();
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(600); // 10 minutes default
  const [selectedDuration, setSelectedDuration] = useState("10");
  const [selectedAnimation, setSelectedAnimation] = useState("waves");
  const [currentSoundIndex, setCurrentSoundIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Get sound data
  const isPlaylist = playlistId !== undefined;
  let currentSound, playlist;

  if (isPlaylist) {
    // Check in categories first, then subcategories
    playlist = soundsData.categories[playlistId as keyof typeof soundsData.categories]?.sounds || 
               soundsData.subcategories[playlistId as keyof typeof soundsData.subcategories]?.sounds || [];
    currentSound = playlist[currentSoundIndex];
  } else {
    // Find sound in all categories and subcategories
    for (const category of Object.values(soundsData.categories)) {
      const found = category.sounds.find(s => s.id === soundId);
      if (found) {
        currentSound = found;
        break;
      }
    }
    // If not found in categories, check subcategories
    if (!currentSound) {
      for (const subcategory of Object.values(soundsData.subcategories)) {
        const found = subcategory.sounds.find(s => s.id === soundId);
        if (found) {
          currentSound = found;
          break;
        }
      }
    }
  }

  // Initialize audio when sound changes
  useEffect(() => {
    if (currentSound && audioRef.current) {
      audioRef.current.src = currentSound.file;
      audioRef.current.loop = true;
      audioRef.current.volume = 0.7;
    }
  }, [currentSound]);

  useEffect(() => {
    setDuration(parseInt(selectedDuration) * 60); // Convert minutes to seconds
  }, [selectedDuration]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && currentTime < duration) {
      interval = setInterval(() => {
        setCurrentTime(prev => prev + 1);
      }, 1000);
    } else if (currentTime >= duration) {
      // Session completed
      if (audioRef.current) {
        audioRef.current.pause();
      }
      navigate('/sounds/feedback', { 
        state: { 
          sound: currentSound,
          duration: selectedDuration,
          isPlaylist 
        }
      });
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentTime, duration, navigate, currentSound, selectedDuration, isPlaylist]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(console.error);
      }
    }
    setIsPlaying(!isPlaying);
  };

  const resetTimer = () => {
    setCurrentTime(0);
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const nextTrack = () => {
    if (isPlaylist && playlist && currentSoundIndex < playlist.length - 1) {
      setCurrentSoundIndex(prev => prev + 1);
      resetTimer();
    }
  };

  const prevTrack = () => {
    if (isPlaylist && currentSoundIndex > 0) {
      setCurrentSoundIndex(prev => prev - 1);
      resetTimer();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!currentSound) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Som não encontrado</h2>
          <Button onClick={() => navigate('/sounds')}>
            Voltar à biblioteca
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-blue-50/30">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 bg-white/80 backdrop-blur-sm border-b border-border">
        <Button variant="ghost" size="sm" onClick={() => navigate('/sounds')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-foreground">{currentSound.name}</h1>
          {isPlaylist && (
            <p className="text-sm text-muted-foreground">
              {currentSoundIndex + 1} de {playlist?.length} • Playlist
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] p-6 space-y-8">
        {/* Animation Area */}
        <div className="w-80 h-80 relative">
          <SoundAnimation 
            type={selectedAnimation} 
            isPlaying={isPlaying}
            soundName={currentSound.name}
          />
        </div>

        {/* Sound Title */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">{currentSound.name}</h2>
          <p className="text-muted-foreground">{currentSound.category}</p>
        </div>

        {/* Timer Display */}
        <div className="text-center">
          <div className="text-3xl font-mono font-bold text-foreground mb-2">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
          <div className="w-80 mb-4">
            <Slider
              value={[currentTime]}
              max={duration}
              step={1}
              className="w-full"
              disabled
            />
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          {isPlaylist && (
            <Button 
              variant="outline" 
              size="icon"
              onClick={prevTrack}
              disabled={currentSoundIndex === 0}
            >
              <SkipBack className="w-4 h-4" />
            </Button>
          )}
          
          <Button 
            size="icon" 
            className="w-16 h-16 rounded-full bg-sounds-primary hover:bg-sounds-secondary"
            onClick={togglePlay}
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
          </Button>

          {isPlaylist && (
            <Button 
              variant="outline" 
              size="icon"
              onClick={nextTrack}
              disabled={!playlist || currentSoundIndex === playlist.length - 1}
            >
              <SkipForward className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Options */}
        <div className="w-full max-w-md space-y-4">
          {/* Duration Selector */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Duração da Sessão
            </label>
            <Select value={selectedDuration} onValueChange={setSelectedDuration}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 minutos</SelectItem>
                <SelectItem value="10">10 minutos</SelectItem>
                <SelectItem value="15">15 minutos</SelectItem>
                <SelectItem value="20">20 minutos</SelectItem>
                <SelectItem value="30">30 minutos</SelectItem>
                <SelectItem value="45">45 minutos</SelectItem>
                <SelectItem value="60">60 minutos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Animation Selector */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Animação Sincronizada
            </label>
            <AnimationSelector 
              selected={selectedAnimation}
              onChange={setSelectedAnimation}
            />
          </div>
        </div>

        <Button 
          variant="outline"
          onClick={resetTimer}
          className="mt-4"
        >
          Reiniciar Sessão
        </Button>
      </div>

      {/* Hidden Audio Element */}
      <audio ref={audioRef} preload="auto" />
    </div>
  );
};

export default SoundPlayer;