import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Wind,
  Heart,
  Waves,
  Target,
  Shield,
  Flower2,
  Square,
  Scale,
  Moon,
  Flame,
  Sparkles,
  Clock,
  Play,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import PracticeScreen from "@/components/breathing/PracticeScreen";
import CompletionScreen from "@/components/breathing/CompletionScreen";
import PatientBottomNav from "@/components/PatientBottomNav";
import PageHeader from "@/components/PageHeader";
import { cn } from "@/lib/utils";

export interface Technique {
  id: string;
  name: string;
  description: string;
  duration: string;
  difficulty: "basic" | "advanced" | "emergency";
  category: string;
  icon: LucideIcon;
  iconBg: string;
  instructions?: string;
}

const breathingTechniques: Technique[] = [
  {
    id: "1",
    name: "Respiração 4-7-8",
    description:
      "Técnica calmante que ajuda a reduzir a ansiedade e promover o relaxamento.",
    duration: "5-10 min",
    difficulty: "basic",
    category: "Relaxamento",
    icon: Flower2,
    iconBg: "bg-[#7C3AED]",
    instructions: "Inspire por 4 segundos, segure por 7 segundos, expire por 8 segundos.",
  },
  {
    id: "2",
    name: "Respiração Tática",
    description:
      "Usada por militares e profissionais de emergência para manter a calma sob pressão.",
    duration: "3-5 min",
    difficulty: "emergency",
    category: "Foco",
    icon: Target,
    iconBg: "bg-[#F97316]",
    instructions: "Inspire por 4, segure por 4, expire por 4 segundos.",
  },
  {
    id: "3",
    name: "Respiração Profunda",
    description: "Respiração diafragmática simples para iniciantes.",
    duration: "5-15 min",
    difficulty: "basic",
    category: "Básico",
    icon: Heart,
    iconBg: "bg-[#10B981]",
    instructions: "Inspire por 4 segundos, expire por 6 segundos (sem pausa).",
  },
  {
    id: "4",
    name: "Respiração de Emergência",
    description: "Para momentos de crise, pânico ou estresse extremo.",
    duration: "2-3 min",
    difficulty: "emergency",
    category: "Crise",
    icon: Flame,
    iconBg: "bg-[#EF4444]",
    instructions: "Inspire por 2, segure por 1, expire por 3 segundos.",
  },
  {
    id: "5",
    name: "Respiração Coerente",
    description: "Equaliza inspiração e expiração para harmonia mental.",
    duration: "10-20 min",
    difficulty: "advanced",
    category: "Meditação",
    icon: Scale,
    iconBg: "bg-[#A855F7]",
    instructions: "Inspire e expire por 5 segundos cada (sem pausas).",
  },
  {
    id: "6",
    name: "Respiração Alternada",
    description: "Técnica de yoga que equilibra os hemisférios cerebrais.",
    duration: "5-10 min",
    difficulty: "advanced",
    category: "Yoga",
    icon: Waves,
    iconBg: "bg-[#14B8A6]",
    instructions: "Inspire por 4, pause por 2, expire por 4 segundos.",
  },
  {
    id: "7",
    name: "Respiração Caixa",
    description: "Box breathing com 4 fases iguais para controle total.",
    duration: "5-15 min",
    difficulty: "emergency",
    category: "Controle",
    icon: Square,
    iconBg: "bg-[#3B82F6]",
    instructions: "Inspire 4s, segure 4s, expire 4s, pause 4s.",
  },
  {
    id: "8",
    name: "Respiração Equilibrada",
    description: "Padrão 4-2-4 para relaxamento suave.",
    duration: "5-10 min",
    difficulty: "basic",
    category: "Equilíbrio",
    icon: Shield,
    iconBg: "bg-[#EC4899]",
    instructions: "Inspire por 4, pause por 2, expire por 4 segundos.",
  },
  {
    id: "9",
    name: "4-7-8 Profundo",
    description: "Versão intensificada da técnica 4-7-8.",
    duration: "5-15 min",
    difficulty: "advanced",
    category: "Relaxamento",
    icon: Moon,
    iconBg: "bg-[#1F2937]",
    instructions: "Inspire por 6, segure por 9, expire por 12 segundos.",
  },
];

const filters: Array<{ id: "all" | "basic" | "advanced" | "emergency"; label: string }> = [
  { id: "all", label: "Todas" },
  { id: "basic", label: "Básica" },
  { id: "advanced", label: "Avançada" },
  { id: "emergency", label: "Emergencial" },
];

const difficultyLabel: Record<string, string> = {
  basic: "Básica",
  advanced: "Avançada",
  emergency: "Emergencial",
};

const difficultyColor: Record<string, string> = {
  basic: "bg-[#10B981]/15 text-[#059669]",
  advanced: "bg-[#7C3AED]/15 text-[#7C3AED]",
  emergency: "bg-[#EF4444]/15 text-[#DC2626]",
};

const GuidedBreathing = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "basic" | "advanced" | "emergency">(
    "all"
  );
  const [currentScreen, setCurrentScreen] = useState<"main" | "practice" | "completion">("main");
  const [selectedTechnique, setSelectedTechnique] = useState<Technique | null>(null);
  const [completedDuration, setCompletedDuration] = useState<number>(5);

  const filteredTechniques = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return breathingTechniques.filter((t) => {
      const matchesSearch =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q);
      const matchesFilter = activeFilter === "all" || t.difficulty === activeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [searchQuery, activeFilter]);

  const featuredTechnique = breathingTechniques[0];

  const handleSelectTechnique = (technique: Technique) => {
    setSelectedTechnique(technique);
    setCurrentScreen("practice");
  };

  const handleBackToMain = () => {
    setCurrentScreen("main");
    setSelectedTechnique(null);
  };

  const handleComplete = (duration: number) => {
    setCompletedDuration(duration);
    setCurrentScreen("completion");
  };

  const handleBackToHome = () => navigate("/home");

  if (currentScreen === "completion") {
    return (
      <CompletionScreen
        onViewOtherOptions={handleBackToMain}
        onBackToHome={handleBackToHome}
        duration={completedDuration}
        techniqueName={selectedTechnique?.name}
      />
    );
  }

  if (currentScreen === "practice" && selectedTechnique) {
    return (
      <PracticeScreen
        technique={selectedTechnique}
        onBack={handleBackToMain}
        onComplete={handleComplete}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-0">
      <PatientBottomNav />

      <PageHeader title="Respiração Guiada" backTo="/home" />

      {/* Intro card + search */}
      <div className="px-4 sm:px-6 pt-6 max-w-5xl mx-auto">
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-11 h-11 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
              <Wind className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground leading-tight">
                Respire com calma e equilibre sua mente
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Técnicas guiadas para reduzir ansiedade, focar e relaxar
              </p>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              placeholder="Busque uma técnica para relaxar"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 bg-background border-border rounded-xl text-base"
            />
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-8 space-y-10 max-w-5xl mx-auto">
        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => {
            const isActive = activeFilter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={cn(
                  "h-10 px-4 rounded-full text-sm font-medium transition-all border",
                  isActive
                    ? "bg-[#7C3AED] text-white border-[#7C3AED] shadow-md"
                    : "bg-card text-foreground border-border hover:border-[#7C3AED]/40"
                )}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Techniques list */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">Técnicas de respiração</h2>
              <p className="text-sm text-muted-foreground">Escolha um exercício e comece</p>
            </div>
            <span className="text-sm text-muted-foreground">
              {filteredTechniques.length}{" "}
              {filteredTechniques.length === 1 ? "técnica" : "técnicas"}
            </span>
          </div>

          {filteredTechniques.length === 0 ? (
            <div className="text-center py-12 rounded-2xl border border-dashed border-border bg-muted/20">
              <Search className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-foreground font-medium mb-1">Nenhuma técnica encontrada</p>
              <p className="text-sm text-muted-foreground">Tente outro termo ou filtro.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredTechniques.map((technique) => {
                const Icon = technique.icon;
                return (
                  <button
                    key={technique.id}
                    onClick={() => handleSelectTechnique(technique)}
                    className="group flex items-start gap-4 p-4 rounded-2xl border border-border bg-card hover:border-[#7C3AED]/40 hover:shadow-md transition-all text-left"
                  >
                    <div
                      className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform shadow-md",
                        technique.iconBg
                      )}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground truncate">
                          {technique.name}
                        </h3>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {technique.description}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={cn(
                            "text-[11px] font-medium px-2 py-0.5 rounded-full",
                            difficultyColor[technique.difficulty]
                          )}
                        >
                          {difficultyLabel[technique.difficulty]}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {technique.duration}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Featured technique */}
        {!searchQuery && activeFilter === "all" && featuredTechnique && (
          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-foreground">Recomendado para você</h2>
              <p className="text-sm text-muted-foreground">A técnica mais usada para relaxar</p>
            </div>

            <div className="relative overflow-hidden rounded-2xl bg-[#F97316] text-white p-6 sm:p-8 shadow-lg">
              <div className="absolute -right-6 -bottom-6 w-40 h-40 rounded-full bg-white/10 pointer-events-none" />
              <div className="absolute right-10 top-6 w-20 h-20 rounded-2xl bg-white/15 flex items-center justify-center pointer-events-none">
                <featuredTechnique.icon className="w-10 h-10 text-white/80" />
              </div>

              <div className="relative max-w-md">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-medium mb-4">
                  <Sparkles className="w-3.5 h-3.5" />
                  Mais praticada
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold mb-2 text-white">
                  {featuredTechnique.name}
                </h3>
                <p className="text-white/90 text-sm mb-5">
                  {featuredTechnique.category} • {featuredTechnique.duration}
                </p>
                <Button
                  onClick={() => handleSelectTechnique(featuredTechnique)}
                  className="bg-white text-[#F97316] hover:bg-white/90 rounded-full font-semibold h-11 px-5 shadow-md"
                >
                  <Play className="w-4 h-4 mr-2 fill-current" />
                  Iniciar prática
                </Button>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default GuidedBreathing;
