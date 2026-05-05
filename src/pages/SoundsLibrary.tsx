import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, Moon, Brain, Target, Leaf, Music, Waves, Heart, Play, Clock, Sparkles } from "lucide-react";
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
      description: "Relaxamento profundo e sono reparador",
      iconBg: "bg-secondary",
      cardBg: "bg-secondary/5 hover:bg-secondary/10 border-secondary/20",
      sounds: 6,
    },
    {
      id: "meditate",
      icon: Brain,
      title: "Para Meditar",
      description: "Paisagens sonoras para mindfulness",
      iconBg: "bg-primary",
      cardBg: "bg-primary/5 hover:bg-primary/10 border-primary/20",
      sounds: 5,
    },
    {
      id: "focus",
      icon: Target,
      title: "Para Focar",
      description: "Concentração e produtividade",
      iconBg: "bg-secondary",
      cardBg: "bg-secondary/5 hover:bg-secondary/10 border-secondary/20",
      sounds: 5,
    },
  ];

  const subCategories = [
    { id: "nature", icon: Leaf, title: "Sons da Natureza", count: 3, iconBg: "bg-primary" },
    { id: "instrumental", icon: Music, title: "Músicas Instrumentais", count: 3, iconBg: "bg-secondary" },
    { id: "therapeutic", icon: Waves, title: "Tons Terapêuticos", count: 5, iconBg: "bg-primary" },
    { id: "meditation", icon: Heart, title: "Meditação e Mantras", count: 3, iconBg: "bg-secondary" },
  ];

  // Search across all sounds
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const all = Object.values(soundsData.categories).flatMap((cat) => cat.sounds);
    // Dedupe by id
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

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-0">
      <PatientBottomNav />

      {/* Hero header */}
      <div className="relative overflow-hidden bg-gradient-secondary text-white">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute -top-12 -left-12 w-64 h-64 rounded-full bg-white blur-3xl" />
          <div className="absolute -bottom-20 -right-10 w-72 h-72 rounded-full bg-primary blur-3xl" />
        </div>
        <div className="relative px-4 sm:px-6 pt-4 pb-8">
          <div className="flex items-center gap-3 mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/home")}
              className="text-white hover:bg-white/15 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg sm:text-xl font-semibold">Biblioteca de Sons</h1>
          </div>

          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-xs font-medium mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              Sons terapêuticos
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold leading-tight mb-2">
              Encontre o som perfeito para o seu momento
            </h2>
            <p className="text-white/80 text-sm sm:text-base mb-5">
              Relaxe, medite ou foque com nossa coleção curada.
            </p>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Busque um som (ex.: chuva, 432 Hz)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 h-12 bg-white text-foreground border-0 shadow-lg"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-6 space-y-8 max-w-5xl mx-auto">
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
                    <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shrink-0 group-hover:scale-105 transition-transform">
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
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Categorias Principais</h2>
                  <p className="text-sm text-muted-foreground">Escolha um objetivo para começar</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {mainCategories.map((category) => {
                  const Icon = category.icon;
                  return (
                    <button
                      key={category.id}
                      onClick={() => navigate(`/sounds/category/${category.id}`)}
                      className={cn(
                        "group relative overflow-hidden text-left p-5 rounded-2xl border transition-all hover:shadow-lg hover:-translate-y-0.5",
                        category.cardBg
                      )}
                    >
                      <div className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-4 shadow-md group-hover:scale-110 transition-transform",
                        category.iconBg
                      )}>
                        <Icon className="w-7 h-7" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-1">{category.title}</h3>
                      <p className="text-sm text-muted-foreground mb-3">{category.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-foreground/70">
                          {category.sounds} sons
                        </span>
                        <span className="text-foreground/60 group-hover:translate-x-1 transition-transform">→</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Playlists */}
            <section className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Playlists</h2>
                <p className="text-sm text-muted-foreground">Coleções por estilo de som</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {subCategories.map((category) => {
                  const Icon = category.icon;
                  return (
                    <button
                      key={category.id}
                      onClick={() => navigate(`/sounds/subcategory/${category.id}`)}
                      className="group flex items-center gap-4 p-4 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all text-left"
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform",
                        category.iconBg
                      )}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-foreground">{category.title}</h4>
                        <p className="text-xs text-muted-foreground">{category.count} opções</p>
                      </div>
                      <span className="text-muted-foreground group-hover:translate-x-1 group-hover:text-primary transition-all">→</span>
                    </button>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default SoundsLibrary;
