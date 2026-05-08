import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { breathingPatterns, BreathingPattern } from "./BreathingPatterns";
import { Flower2, Scale, Target, Shield, Heart, Flame, Wind } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PatternSelectorProps {
  onSelect: (pattern: BreathingPattern, patternKey: string) => void;
  currentPattern?: string;
}

const PatternSelector = ({ onSelect, currentPattern }: PatternSelectorProps) => {
  const getPatternIcon = (type: string): LucideIcon => {
    switch (type) {
      case 'relaxation': return Flower2;
      case 'balance': return Scale;
      case 'focus': return Target;
      case 'control': return Shield;
      case 'calm': return Heart;
      case 'crisis': return Flame;
      default: return Wind;
    }
  };

  const getPatternBg = (type: string) => {
    switch (type) {
      case 'relaxation': return 'bg-[#10B981]';
      case 'balance': return 'bg-[#A855F7]';
      case 'focus': return 'bg-[#F97316]';
      case 'control': return 'bg-[#3B82F6]';
      case 'calm': return 'bg-[#EC4899]';
      case 'crisis': return 'bg-[#EF4444]';
      default: return 'bg-[#7C3AED]';
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-2">Escolha um Padrão de Respiração</h3>
        <p className="text-sm text-muted-foreground">Selecione o padrão que melhor se adapta às suas necessidades</p>
      </div>
      
      <div className="grid gap-3">
        {Object.entries(breathingPatterns).map(([key, pattern]) => (
          <Card 
            key={key}
            className={`cursor-pointer transition-all duration-200 ${getPatternColor(pattern.type)} ${
              currentPattern === key ? 'ring-2 ring-primary ring-offset-2' : ''
            }`}
            onClick={() => onSelect(pattern, key)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{getPatternIcon(pattern.type)}</span>
                <div className="flex-1">
                  <CardTitle className="text-base">{pattern.name}</CardTitle>
                  <CardDescription className="text-xs">{pattern.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-secondary"></div>
                  <span>{pattern.inhale}s</span>
                </div>
                {pattern.hold > 0 && (
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-success"></div>
                    <span>{pattern.hold}s</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-primary"></div>
                  <span>{pattern.exhale}s</span>
                </div>
                {pattern.pause > 0 && (
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-muted-foreground"></div>
                    <span>{pattern.pause}s</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PatternSelector;