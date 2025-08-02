import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { breathingPatterns, BreathingPattern } from "./BreathingPatterns";

interface PatternSelectorProps {
  onSelect: (pattern: BreathingPattern, patternKey: string) => void;
  currentPattern?: string;
}

const PatternSelector = ({ onSelect, currentPattern }: PatternSelectorProps) => {
  const getPatternIcon = (type: string) => {
    switch (type) {
      case 'relaxation': return '🌿';
      case 'balance': return '⚖️';
      case 'focus': return '🎯';
      case 'control': return '🛡️';
      case 'calm': return '💚';
      case 'crisis': return '🚨';
      default: return '🫁';
    }
  };

  const getPatternColor = (type: string) => {
    switch (type) {
      case 'relaxation': return 'border-green-200 bg-green-50 hover:bg-green-100';
      case 'balance': return 'border-blue-200 bg-blue-50 hover:bg-blue-100';
      case 'focus': return 'border-purple-200 bg-purple-50 hover:bg-purple-100';
      case 'control': return 'border-orange-200 bg-orange-50 hover:bg-orange-100';
      case 'calm': return 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100';
      case 'crisis': return 'border-red-200 bg-red-50 hover:bg-red-100';
      default: return 'border-gray-200 bg-gray-50 hover:bg-gray-100';
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
                  <div className="w-3 h-3 rounded bg-blue-400"></div>
                  <span>{pattern.inhale}s</span>
                </div>
                {pattern.hold > 0 && (
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-green-400"></div>
                    <span>{pattern.hold}s</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-orange-400"></div>
                  <span>{pattern.exhale}s</span>
                </div>
                {pattern.pause > 0 && (
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-gray-400"></div>
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