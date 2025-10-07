import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BreathingTechniques from "@/components/breathing/BreathingTechniques";
import PracticeScreen from "@/components/breathing/PracticeScreen";
import CompletionScreen from "@/components/breathing/CompletionScreen";

interface Technique {
  id: string;
  name: string;
  description: string;
  duration: string;
  difficulty: 'basic' | 'advanced' | 'emergency';
  category: string;
  icon: string;
  instructions?: string;
}

const breathingTechniques: Technique[] = [
  {
    id: '1',
    name: 'Respiração 4-7-8',
    description: 'Técnica calmante que ajuda a reduzir a ansiedade e promover o relaxamento.',
    duration: '5-10 min',
    difficulty: 'basic',
    category: 'Relaxamento',
    icon: '🌿',
    instructions: 'Inspire por 4 segundos, segure por 7 segundos, expire por 8 segundos.'
  },
  {
    id: '2',
    name: 'Respiração Tática',
    description: 'Usada por militares e profissionais de emergência para manter a calma sob pressão.',
    duration: '3-5 min',
    difficulty: 'emergency',
    category: 'Foco',
    icon: '🎯',
    instructions: 'Inspire por 4, segure por 4, expire por 4 segundos.'
  },
  {
    id: '3',
    name: 'Respiração Profunda',
    description: 'Respiração diafragmática simples para iniciantes.',
    duration: '5-15 min',
    difficulty: 'basic',
    category: 'Básico',
    icon: '💚',
    instructions: 'Inspire por 4 segundos, expire por 6 segundos (sem pausa).'
  },
  {
    id: '4',
    name: 'Respiração de Emergência',
    description: 'Para momentos de crise, pânico ou estresse extremo.',
    duration: '2-3 min',
    difficulty: 'emergency',
    category: 'Crise',
    icon: '🚨',
    instructions: 'Inspire por 2, segure por 1, expire por 3 segundos.'
  },
  {
    id: '5',
    name: 'Respiração Coerente',
    description: 'Equaliza inspiração e expiração para harmonia mental.',
    duration: '10-20 min',
    difficulty: 'advanced',
    category: 'Meditação',
    icon: '⚖️',
    instructions: 'Inspire e expire por 5 segundos cada (sem pausas).'
  },
  {
    id: '6',
    name: 'Respiração Alternada',
    description: 'Técnica de yoga que equilibra os hemisférios cerebrais.',
    duration: '5-10 min',
    difficulty: 'advanced',
    category: 'Yoga',
    icon: '🧘',
    instructions: 'Inspire por 4, pause por 2, expire por 4 segundos.'
  },
  {
    id: '7',
    name: 'Respiração Caixa',
    description: 'Box breathing com 4 fases iguais para controle total.',
    duration: '5-15 min',
    difficulty: 'emergency',
    category: 'Controle',
    icon: '⬜',
    instructions: 'Inspire 4s, segure 4s, expire 4s, pause 4s.'
  },
  {
    id: '8',
    name: 'Respiração Equilibrada',
    description: 'Padrão 4-2-4 para relaxamento suave.',
    duration: '5-10 min',
    difficulty: 'basic',
    category: 'Equilíbrio',
    icon: '🌸',
    instructions: 'Inspire por 4, pause por 2, expire por 4 segundos.'
  },
  {
    id: '9',
    name: '4-7-8 Profundo',
    description: 'Versão intensificada da técnica 4-7-8.',
    duration: '5-15 min',
    difficulty: 'advanced',
    category: 'Relaxamento',
    icon: '🌙',
    instructions: 'Inspire por 6, segure por 9, expire por 12 segundos.'
  }
];

const GuidedBreathing = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [currentScreen, setCurrentScreen] = useState<'main' | 'practice' | 'completion'>('main');
  const [selectedTechnique, setSelectedTechnique] = useState<Technique | null>(null);
  const [completedDuration, setCompletedDuration] = useState<number>(5);

  const handleSelectTechnique = (technique: Technique) => {
    setSelectedTechnique(technique);
    setCurrentScreen('practice');
  };

  const handleBackToMain = () => {
    setCurrentScreen('main');
    setSelectedTechnique(null);
  };

  const handleComplete = () => {
    setCurrentScreen('completion');
  };

  const handleBackToHome = () => {
    navigate('/home');
  };

  if (currentScreen === 'completion') {
    return (
      <CompletionScreen 
        onViewOtherOptions={handleBackToMain}
        onBackToHome={handleBackToHome}
        duration={completedDuration}
      />
    );
  }

  if (currentScreen === 'practice' && selectedTechnique) {
    return (
      <PracticeScreen 
        technique={selectedTechnique}
        onBack={handleBackToMain}
        onComplete={handleComplete}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-border">
        <Button variant="ghost" size="sm" onClick={() => navigate('/home')}>
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-xl font-semibold text-foreground">Respiração Guiada</h1>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
          <Input
            placeholder="Busque uma técnica para relaxar"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filter Tabs */}
        <Tabs value={activeFilter} onValueChange={setActiveFilter} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all" className="text-xs">
              Todas
            </TabsTrigger>
            <TabsTrigger value="basic" className="text-xs">
              🌿 Básica
            </TabsTrigger>
            <TabsTrigger value="advanced" className="text-xs">
              🌀 Avançada
            </TabsTrigger>
            <TabsTrigger value="emergency" className="text-xs">
              ⚠️ Emergencial
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeFilter} className="mt-6">
            <BreathingTechniques 
              techniques={breathingTechniques}
              onSelectTechnique={handleSelectTechnique}
              searchQuery={searchQuery}
              activeFilter={activeFilter}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default GuidedBreathing;