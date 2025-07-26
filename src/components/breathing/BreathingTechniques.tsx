import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Star } from "lucide-react";

interface Technique {
  id: string;
  name: string;
  description: string;
  duration: string;
  difficulty: 'basic' | 'advanced' | 'emergency';
  category: string;
  icon: string;
}

interface BreathingTechniquesProps {
  techniques: Technique[];
  onSelectTechnique: (technique: Technique) => void;
  searchQuery: string;
  activeFilter: string;
}

const BreathingTechniques = ({ 
  techniques, 
  onSelectTechnique, 
  searchQuery, 
  activeFilter 
}: BreathingTechniquesProps) => {
  const filteredTechniques = techniques.filter(technique => {
    const matchesSearch = technique.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         technique.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter === 'all' || technique.difficulty === activeFilter;
    return matchesSearch && matchesFilter;
  });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'basic': return 'bg-breathing-primary';
      case 'advanced': return 'bg-evolution-primary';
      case 'emergency': return 'bg-sos-primary';
      default: return 'bg-primary';
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'basic': return 'Básica';
      case 'advanced': return 'Avançada';
      case 'emergency': return 'Emergencial';
      default: return difficulty;
    }
  };

  return (
    <div className="space-y-4">
      {filteredTechniques.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Nenhuma técnica encontrada</p>
        </div>
      ) : (
        filteredTechniques.map((technique) => (
          <Card 
            key={technique.id}
            className="cursor-pointer transition-all duration-300 hover:shadow-calm hover:scale-105"
            onClick={() => onSelectTechnique(technique)}
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="text-2xl">{technique.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-card-foreground">{technique.name}</h3>
                    <Badge 
                      className={`text-white text-xs ${getDifficultyColor(technique.difficulty)}`}
                    >
                      {getDifficultyLabel(technique.difficulty)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                    {technique.description}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock size={12} />
                      <span>{technique.duration}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star size={12} />
                      <span>{technique.category}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default BreathingTechniques;