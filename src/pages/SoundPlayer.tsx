import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, SkipBack, SkipForward, Clock, Loader2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { soundsData } from "@/data/soundsData";
import AnimationSelector from "@/components/sounds/AnimationSelector";
import SoundAnimation, { type AnimationType } from "@/components/sounds/SoundAnimation";
import { useAudioAnalyser } from "@/hooks/useAudioAnalyser";

const SoundPlayer = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { soundId, playlistId } = useParams<{ soundId: string; playlistId?: string }>();
  const startIndex = (location.state as { startIndex?: number } | null)?.startIndex ?? 0;

  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(600);
  const [selectedDuration, setSelectedDuration] = useState("10");
  const [selectedAnimation, setSelectedAnimation] = useState<AnimationType>("waves");
  const [currentSoundIndex, setCurrentSoundIndex] = useState(startIndex);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubValue, setScrubValue] = useState(0);
  const [isBuffering, setIsBuffering] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const pendingSeekRef = useRef<number | null>(null);
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

  const seekAudioToSessionTime = (sessionSeconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    const audioDuration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
    if (!audioDuration) {
      pendingSeekRef.current = sessionSeconds;
      return;
    }

    const targetTime = sessionSeconds % audioDuration;
    audio.currentTime = Math.min(Math.max(targetTime, 0), Math.max(audioDuration - 0.05, 0));
    pendingSeekRef.current = null;
  };

  useEffect(() => {
    if (currentSound && audioRef.current) {
      const audio = audioRef.current;
      if (audio.src !== new URL(currentSound.file, window.location.href).href) {
        audio.src = currentSound.file;
      }
      audio.loop = true;
      audio.volume = 0.7;
      audio.onended = null;
      audio.onloadedmetadata = () => {
        seekAudioToSessionTime(pendingSeekRef.current ?? currentTime);
      };
      if (isPlaying) {
        void resume();
        audio.play().catch(console.error);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSound?.id]);


  useEffect(() => {
    setDuration(parseInt(selectedDuration) * 60);
  }, [selectedDuration]);

  useEffect(() => {
    let interval: ReturnType<typeof setTimeout>;
    if (isPlaying && !isScrubbing && currentTime < duration) {
      interval = setInterval(() => {
        setCurrentTime((prev) => prev + 1);
      }, 1000);
    } else if (currentTime >= duration) {
      if (isPlaylist && playlist && currentSoundIndex < playlist.length - 1) {
        // Auto advance to next track in playlist
        setCurrentSoundIndex((prev) => prev + 1);
        setCurrentTime(0);
        if (audioRef.current) audioRef.current.currentTime = 0;
      } else {
        if (audioRef.current) audioRef.current.pause();
        const totalPlayed = isPlaylist && playlist ? playlist.length : 1;
        navigate("/sounds/feedback", {
          state: {
            sound: currentSound,
            duration: selectedDuration,
            isPlaylist,
            totalSounds: totalPlayed,
          },
        });
      }
    }
    return () => clearInterval(interval);
  }, [isPlaying, isScrubbing, currentTime, duration, navigate, currentSound, selectedDuration, isPlaylist]);

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

  const resetTimer = (autoPlay = false) => {
    setCurrentTime(0);
    setIsPlaying(autoPlay);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const nextTrack = () => {
    if (isPlaylist && playlist && currentSoundIndex < playlist.length - 1) {
      setCurrentSoundIndex((prev) => prev + 1);
      resetTimer(true);
    }
  };

  const prevTrack = () => {
    if (isPlaylist && currentSoundIndex > 0) {
      setCurrentSoundIndex((prev) => prev - 1);
      resetTimer(true);
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
      <PageHeader title={currentSound.name} onBack={() => navigate("/sounds")} />


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
          <Slider
            value={[isScrubbing ? scrubValue : Math.min(currentTime, duration)]}
            max={duration}
            step={1}
            onValueChange={(v) => {
              const nextValue = v[0];
              setIsScrubbing(true);
              setScrubValue(nextValue);
              seekAudioToSessionTime(nextValue);
            }}
            onValueCommit={(v) => {
              const nextValue = v[0];
              setCurrentTime(nextValue);
              setScrubValue(nextValue);
              seekAudioToSessionTime(nextValue);
              setIsScrubbing(false);
              if (isPlaying && audioRef.current?.paused) {
                void resume();
                audioRef.current.play().catch(console.error);
              }
            }}
          />
          <div className="flex justify-between text-xs text-muted-foreground font-mono">
            <span>{formatTime(isScrubbing ? scrubValue : currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>

          <div className="flex items-center justify-center gap-3 pt-1">
            {isPlaylist && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={prevTrack}
                disabled={currentSoundIndex === 0}
                className="rounded-full bg-muted/60 hover:bg-muted"
              >
                <SkipBack className="w-4 h-4" />
              </Button>
            )}
            <Button
              size="icon-lg"
              className="w-14 h-14 rounded-full bg-primary hover:bg-primary-hover text-primary-foreground shadow-lg"
              onClick={togglePlay}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </Button>
            {isPlaylist && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={nextTrack}
                disabled={!playlist || currentSoundIndex === playlist.length - 1}
                className="rounded-full bg-muted/60 hover:bg-muted"
              >
                <SkipForward className="w-4 h-4" />
              </Button>
            )}
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
