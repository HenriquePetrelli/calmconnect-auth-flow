import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Play, Pause, SkipBack, SkipForward, Heart, Share2, Clock } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { soundsData } from "@/data/soundsData";
import AnimationSelector from "@/components/sounds/AnimationSelector";
import SoundAnimation, { type AnimationType } from "@/components/sounds/SoundAnimation";
import { useAudioAnalyser } from "@/hooks/useAudioAnalyser";

const SoundPlayer = () => {
  const navigate = useNavigate();
  const { soundId, playlistId } = useParams<{ soundId: string; playlistId?: string }>();

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(600);
  const [selectedDuration, setSelectedDuration] = useState("10");
  const [selectedAnimation, setSelectedAnimation] = useState<AnimationType>("waves");
  const [currentSoundIndex, setCurrentSoundIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { levelsRef, resume } = useAudioAnalyser(audioRef.current, {
    enabled: isPlaying,
  });

  const isPlaylist = playlistId !== undefined;
  let currentSound, playlist;

  if (isPlaylist) {
    playlist =
      soundsData.categories[playlistId as keyof typeof soundsData.categories]?.sounds ||
      soundsData.subcategories[playlistId as keyof typeof soundsData.subcategories]?.sounds ||
      [];
    currentSound = playlist[currentSoundIndex];
  } else {
    for (const category of Object.values(soundsData.categories)) {
      const found = category.sounds.find((s) => s.id === soundId);
      if (found) {
        currentSound = found;
        break;
      }
    }
    if (!currentSound) {
      for (const subcategory of Object.values(soundsData.subcategories)) {
        const found = subcategory.sounds.find((s) => s.id === soundId);
        if (found) {
          currentSound = found;
          break;
        }
      }
    }
  }

  useEffect(() => {
    if (currentSound && audioRef.current) {
      audioRef.current.src = currentSound.file;
      audioRef.current.loop = true;
      audioRef.current.volume = 0.7;
      audioRef.current.onended = null;
    }
  }, [currentSound]);

  useEffect(() => {
    setDuration(parseInt(selectedDuration) * 60);
  }, [selectedDuration]);

  useEffect(() => {
    let interval: ReturnType<typeof setTimeout>;
    if (isPlaying && currentTime < duration) {
      interval = setInterval(() => {
        setCurrentTime((prev) => prev + 1);
      }, 1000);
    } else if (currentTime >= duration) {
      if (audioRef.current) audioRef.current.pause();
      navigate("/sounds/feedback", {
        state: { sound: currentSound, duration: selectedDuration, isPlaylist },
      });
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentTime, duration, navigate, currentSound, selectedDuration, isPlaylist]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        void resume();
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
      setCurrentSoundIndex((prev) => prev + 1);
      resetTimer();
    }
  };

  const prevTrack = () => {
    if (isPlaylist && currentSoundIndex > 0) {
      setCurrentSoundIndex((prev) => prev - 1);
      resetTimer();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (!currentSound) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Som não encontrado</h2>
          <Button onClick={() => navigate("/sounds")}>Voltar à biblioteca</Button>
        </div>
      </div>
    );
  }

  const progressPct = (currentTime / duration) * 100;

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-background to-secondary/5 overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-background/80 backdrop-blur-sm border-b border-border shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon-sm" onClick={() => navigate("/sounds")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">{currentSound.category}</p>
            <h1 className="text-sm font-semibold text-foreground truncate">Reproduzindo</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" className="rounded-full">
            <Heart className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" className="rounded-full">
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 min-h-0 flex flex-col items-center justify-between px-4 py-4 max-w-2xl w-full mx-auto">
        {/* Animation circle */}
        <div className="flex-1 min-h-0 flex items-center justify-center w-full py-2">
          <div className="aspect-square h-full max-h-[42vh] max-w-[42vh]">
            <SoundAnimation
              type={selectedAnimation}
              isPlaying={isPlaying}
              levelsRef={levelsRef}
              circular
            />
          </div>
        </div>

        {/* Title */}
        <div className="text-center shrink-0">
          <h2 className="text-xl font-bold text-foreground leading-tight">{currentSound.name}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{currentSound.category}</p>
        </div>

        {/* Progress + controls */}
        <div className="w-full shrink-0 mt-3 space-y-2">
          <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground font-mono">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>

          <div className="flex items-center justify-center gap-3 pt-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={prevTrack}
              disabled={!isPlaylist || currentSoundIndex === 0}
              className="rounded-full bg-muted/60 hover:bg-muted"
            >
              <SkipBack className="w-4 h-4" />
            </Button>
            <Button
              size="icon-lg"
              className="w-14 h-14 rounded-full bg-primary hover:bg-primary-hover text-primary-foreground shadow-lg"
              onClick={togglePlay}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={nextTrack}
              disabled={!isPlaylist || !playlist || currentSoundIndex === playlist.length - 1}
              className="rounded-full bg-muted/60 hover:bg-muted"
            >
              <SkipForward className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Animation + duration options */}
        <div className="w-full shrink-0 mt-3 grid gap-2">
          <AnimationSelector selected={selectedAnimation} onChange={setSelectedAnimation} />
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
            <Select value={selectedDuration} onValueChange={setSelectedDuration}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0.25">15 segundos</SelectItem>
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
        </div>
      </div>

      <audio ref={audioRef} preload="auto" />
    </div>
  );
};

export default SoundPlayer;
