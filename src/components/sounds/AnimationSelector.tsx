import { Button } from "@/components/ui/button";
import { Waves, Trees, Cloud, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnimationSelectorProps {
  selected: string;
  onChange: (animation: string) => void;
}

const animations = [
  { id: "waves", icon: <Waves className="w-4 h-4" />, label: "Ondas" },
  { id: "forest", icon: <Trees className="w-4 h-4" />, label: "Floresta" },
  { id: "clouds", icon: <Cloud className="w-4 h-4" />, label: "Nuvens" },
  { id: "spirals", icon: <Zap className="w-4 h-4" />, label: "Espirais" },
];

const AnimationSelector = ({ selected, onChange }: AnimationSelectorProps) => {
  return (
    <div className="grid grid-cols-2 gap-2">
      {animations.map((animation) => (
        <Button
          key={animation.id}
          variant={selected === animation.id ? "default" : "outline"}
          size="sm"
          onClick={() => onChange(animation.id)}
          className={cn(
            "flex items-center gap-2",
            selected === animation.id && "bg-sounds-primary hover:bg-sounds-secondary"
          )}
        >
          {animation.icon}
          {animation.label}
        </Button>
      ))}
    </div>
  );
};

export default AnimationSelector;