import { Button } from "@/components/ui/button";
import { Waves, CloudRain, Flame, Wind, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AnimationType } from "./SoundAnimation";

interface AnimationSelectorProps {
  selected: string;
  onChange: (animation: AnimationType) => void;
}

const animations: Array<{
  id: AnimationType;
  icon: JSX.Element;
  label: string;
}> = [
  { id: "waves", icon: <Waves className="w-4 h-4" />, label: "Ondas" },
  { id: "rain", icon: <CloudRain className="w-4 h-4" />, label: "Chuva" },
  { id: "fire", icon: <Flame className="w-4 h-4" />, label: "Fogo" },
  { id: "breathing", icon: <Wind className="w-4 h-4" />, label: "Respiração" },
  { id: "ambient", icon: <Sparkles className="w-4 h-4" />, label: "Ambiente" },
];

const AnimationSelector = ({ selected, onChange }: AnimationSelectorProps) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
      {animations.map((animation) => {
        const isActive = selected === animation.id;
        return (
          <Button
            key={animation.id}
            variant={isActive ? "default" : "outline"}
            size="sm"
            onClick={() => onChange(animation.id)}
            className={cn(
              "flex items-center gap-2 transition-all",
              isActive &&
                "bg-primary hover:bg-primary-hover text-primary-foreground border-0 shadow-md"
            )}
          >
            {animation.icon}
            <span className="text-xs">{animation.label}</span>
          </Button>
        );
      })}
    </div>
  );
};

export default AnimationSelector;
