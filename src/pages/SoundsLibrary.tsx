import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Search,
  Moon,
  Sparkles,
  Target,
  Music,
  Headphones,
  Heart,
  Flower2,
  Play,
  Clock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import PatientBottomNav from "@/components/PatientBottomNav";
import { soundsData } from "@/data/soundsData";
import { cn } from "@/lib/utils";

const SoundsLibrary = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const mainCategories = [
    {
      id: "sleep",
      icon: Moon,
      title: "Para Dormir",
      description: "Sons relaxantes profundos e sono reparador",
      iconBg: "bg-[#7C3AED]",
      sounds: 6,
    },
    {
      id: "meditate",
      icon: Sparkles,
      title: "Para Meditar",
      description: "Paisagens sonoras para mindfulness",
      iconBg: "bg-[#F97316]",
      sounds: 5,
    },
    {
      id: "focus",
      icon: Target,
      title: "Para Focar",
      description: "Concentração e produtividade",
      iconBg: "bg-[#10B981]",
      sounds: 5,
    },
  ];

  const subCategories = [
    {
      id: "nature",
      icon: Music,
      title: "Sons da Natureza",
      iconBg: "bg-[#14B8A6]",
      count: soundsData.subcategories.nature.sounds.length,
    },
    {
      id: "instrumental",
      icon: Music,
      title: "Músicas Instrumentais",
      iconBg: "bg-[#A855F7]",
      count: soundsData.subcategories.instrumental.sounds.length,
    },
    {
      id: "therapeutic",
      icon: Headphones,
      title: "Tons Terapêuticos",
      iconBg: "bg-[#F97316]",
      count: soundsData.subcategories.therapeutic.sounds.length,
    },
    {
      id: "meditation",
      icon: Flower2,
      title: "Meditação e Mantras",
      iconBg: "bg-[#EC4899]",
      count: soundsData.subcategories.meditation.sounds.length,
    },
  ];

  // Search across all sounds
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const all = Object.values(soundsData.categories).flatMap((cat) => cat.sounds);
    const seen = new Set<string>();
    return all.filter((s) => {
      if (seen.has(s.id)) return false;
      const matches =
        s.name.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q);
      if (matches) {
        seen.add(s.id);
        return true;
      }
      return false;
    });
  }, [searchQuery]);

  const isSearching = searchQuery.trim().length > 0;

  // Featured (recommended) sound
  const featuredSound = soundsData.categories.sleep.sounds[3] // Chuva Suave
    ?? soundsData.categories.sleep.sounds[0];

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-0">
      <PatientBottomNav />

      {/* Hero header — solid purple */}
      <div className="bg-[#7C3AED] text-white">
        <div className="px-4 sm:px-6 pt-5 pb-10 max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/home")}
              className="rounded-full bg-white/15 text-white hover:bg-white/25 hover:text-white h-10 w-10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Headphones className="w-5 h-5" />
              <h1 className="text-lg sm:text-xl font-semibold text-white">Biblioteca de Sons</h1>
            </div>
          </div>

          <h2 className="text-2xl sm:text-4xl font-bold leading-tight mb-2 text-white">
            Encontre o som perfeito para o seu momento
          </h2>
          <p className="text-white/85 text-sm sm:text-base mb-6">
            Relaxe, medite ou foque com nossa coleção curada
          </p>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              placeholder="Busque um som (ex: chuva, floresta...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-14 bg-white text-foreground border-0 rounded-2xl shadow-lg text-base"
            />
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-8 space-y-10 max-w-5xl mx-auto">
        {isSearching ? (
          /* Search Results */
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                Resultados da busca
              </h2>
              <span className="text-sm text-muted-foreground">
                {searchResults.length} {searchResults.length === 1 ? "som" : "sons"}
              </span>
            </div>

            {searchResults.length === 0 ? (
              <div className="text-center py-12 rounded-2xl border border-dashed border-border bg-muted/20">
                <Search className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-foreground font-medium mb-1">Nenhum som encontrado</p>
                <p className="text-sm text-muted-foreground">
                  Tente buscar por outro termo.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {searchResults.map((sound) => (
                  <button
                    key={sound.id}
                    onClick={() => navigate(`/sounds/player/${sound.id}`)}
                    className="group flex items-center gap-3 p-4 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all text-left"
                  >
                    <div className="w-12 h-12 rounded-xl bg-[#7C3AED] flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform">
                      <Play className="w-5 h-5 fill-current" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground truncate">{sound.name}</h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span className="truncate">{sound.category}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3" />
                          {sound.duration}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Main Categories */}
            <section className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-foreground">Categorias Principais</h2>
                <p className="text-sm text-muted-foreground">Escolha um objetivo para começar</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {mainCategories.map((category) => {
                  const Icon = category.icon;
                  return (
                    <button
                      key={category.id}
                      onClick={() => navigate(`/sounds/category/${category.id}`)}
                      className="group text-left p-5 rounded-2xl border border-border bg-card hover:shadow-lg hover:-translate-y-0.5 transition-all"
                    >
                      <div
                        className={cn(
                          "w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-5 shadow-md group-hover:scale-105 transition-transform",
                          category.iconBg
                        )}
                      >
                        <Icon className="w-7 h-7" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-1">
                        {category.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-5 min-h-[2.5rem]">
                        {category.description}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {category.sounds} sons
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Playlists */}
            <section className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-foreground">Playlists</h2>
                <p className="text-sm text-muted-foreground">Coleções por estilo de som</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {subCategories.map((category) => {
                  const Icon = category.icon;
                  return (
                    <button
                      key={category.id}
                      onClick={() => navigate(`/sounds/subcategory/${category.id}`)}
                      className="group flex items-center gap-4 p-4 rounded-2xl border border-border bg-card hover:shadow-md transition-all text-left"
                    >
                      <div
                        className={cn(
                          "w-14 h-14 rounded-2xl flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform",
                          category.iconBg
                        )}
                      >
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-foreground">{category.title}</h4>
                        <p className="text-xs text-muted-foreground">
                          {category.count} opções
                        </p>
                      </div>
                      <span className="text-muted-foreground group-hover:translate-x-1 group-hover:text-primary transition-all">
                        →
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Recommended */}
            {featuredSound && (
              <section className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Recomendados para você</h2>
                  <p className="text-sm text-muted-foreground">Baseado no seu histórico de uso</p>
                </div>

                <div className="relative overflow-hidden rounded-2xl bg-[#F97316] text-white p-6 sm:p-8 shadow-lg">
                  <div className="absolute -right-6 -bottom-6 w-40 h-40 rounded-full bg-white/10 pointer-events-none" />
                  <div className="absolute right-10 top-6 w-20 h-20 rounded-2xl bg-white/15 flex items-center justify-center pointer-events-none">
                    <Music className="w-10 h-10 text-white/80" />
                  </div>

                  <div className="relative max-w-md">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-medium mb-4">
                      <Sparkles className="w-3.5 h-3.5" />
                      Mais ouvido
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-bold mb-2 text-white">
                      {featuredSound.name}
                    </h3>
                    <p className="text-white/90 text-sm mb-5">
                      {featuredSound.category} • {featuredSound.duration}
                    </p>
                    <Button
                      onClick={() => navigate(`/sounds/player/${featuredSound.id}`)}
                      className="bg-white text-[#F97316] hover:bg-white/90 rounded-full font-semibold h-11 px-5 shadow-md"
                    >
                      <Play className="w-4 h-4 mr-2 fill-current" />
                      Reproduzir agora
                    </Button>
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SoundsLibrary;
