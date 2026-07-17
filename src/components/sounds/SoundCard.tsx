import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Clock } from "lucide-react";

interface Sound {
  id: string;
  name: string;
  duration: string;
  category: string;
  file: string;
  cover?: string;
}

interface SoundCardProps {
  sound: Sound;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSoundClick: () => void;
}

const SoundCard = ({ sound, isPlaying, onTogglePlay, onSoundClick }: SoundCardProps) => {
  return (
    <Card className="transition-all duration-300">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Sound Info */}
          <div 
            className="flex-1 cursor-pointer"
            onClick={onSoundClick}
          >
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-foreground">{sound.name}</h3>
              <Badge variant="outline" className="text-xs">
                {sound.category}
              </Badge>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{sound.duration}</span>
            </div>
          </div>

          {/* Play Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onTogglePlay}
            className="text-sounds-primary hover:text-sounds-primary/80 hover:bg-sounds-primary/10"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SoundCard;