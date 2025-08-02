import { ArrowRight, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Sound {
  id: string;
  name: string;
  duration: string;
  category: string;
  file: string;
}

interface SoundItemProps {
  sound: Sound;
  onClick: () => void;
}

const SoundItem = ({ sound, onClick }: SoundItemProps) => {
  return (
    <div 
      className="flex items-center justify-between p-4 border-b border-border cursor-pointer transition-all duration-200 hover:bg-muted/30"
      onClick={onClick}
    >
      <div className="flex-1">
        <h4 className="font-medium text-foreground mb-1">{sound.name}</h4>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Badge variant="outline" className="text-xs">
            {sound.category}
          </Badge>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{sound.duration}</span>
          </div>
        </div>
      </div>
      
      <ArrowRight className="w-5 h-5 text-muted-foreground ml-4" />
    </div>
  );
};

export default SoundItem;