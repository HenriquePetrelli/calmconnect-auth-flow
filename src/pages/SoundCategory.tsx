import { Button } from "@/components/ui/button";
import { ArrowLeft, Play, Sparkles, Clock, Music } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { soundsData } from "@/data/soundsData";

const SoundCategory = () => {
  const navigate = useNavigate();
  const { categoryId, subcategoryId } = useParams<{ categoryId: string; subcategoryId: string }>();

  const isSubcategory = subcategoryId !== undefined;
  const id = isSubcategory ? subcategoryId : categoryId;
  const category = isSubcategory
    ? soundsData.subcategories[subcategoryId as keyof typeof soundsData.subcategories]
    : soundsData.categories[categoryId as keyof typeof soundsData.categories];

  if (!category) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">
            {isSubcategory ? "Subcategoria" : "Categoria"} não encontrada
          </h2>
          <Button onClick={() => navigate("/sounds")}>Voltar às categorias</Button>
        </div>
      </div>
    );
  }

  const goToPlaylist = (startIndex: number) => {
    navigate(`/sounds/player/playlist/${id}`, { state: { startIndex } });
  };

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Header — solid secondary */}
      <div className="bg-secondary text-secondary-foreground">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-5 pb-10">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/sounds")}
              className="rounded-full bg-white/15 text-secondary-foreground hover:bg-white/25 hover:text-secondary-foreground h-10 w-10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              <h1 className="text-lg sm:text-xl font-semibold">{category.title}</h1>
            </div>
          </div>
          {(category as any).description && (
            <p className="text-secondary-foreground/85 text-sm sm:text-base mt-3 ml-13 sm:ml-14">
              {(category as any).description}
            </p>
          )}
        </div>
      </div>

      {/* Stats + Play all */}
      <div className="bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-2xl font-bold text-foreground leading-none">
              {category.sounds.length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Sons disponíveis</p>
          </div>
          <Button
            onClick={() => goToPlaylist(0)}
            className="rounded-full font-semibold h-11 px-6 shadow-md"
          >
            <Play className="w-4 h-4 mr-2 fill-current" />
            Reproduzir todos
          </Button>
        </div>
      </div>

      {/* Sound list */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-3">
        {category.sounds.map((sound, idx) => (
          <button
            key={sound.id}
            onClick={() => goToPlaylist(idx)}
            className="w-full group flex items-center gap-4 p-4 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shrink-0 group-hover:scale-105 transition-transform">
              <Play className="w-5 h-5 fill-current" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate">{sound.name}</h3>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                <span className="flex items-center gap-1 truncate">
                  <Music className="w-3 h-3" />
                  {sound.category}
                </span>
                <span className="flex items-center gap-1 shrink-0">
                  <Clock className="w-3 h-3" />
                  {sound.duration}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default SoundCategory;
