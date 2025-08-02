import { Clock } from "lucide-react";

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
      className="flex items-center justify-between p-4 border-b border-border cursor-pointer"
      onClick={onClick}
    >
      <div className="flex-1">
        <h4 className="font-medium text-foreground mb-1">{sound.name}</h4>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{sound.category}</span>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{sound.duration}</span>
          </div>
        </div>
      </div>
      
      <span className="text-lg text-muted-foreground ml-4">→</span>
    </div>
  );
};

export default SoundItem;