import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Play, Clock, ListMusic } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import SoundItem from "@/components/sounds/SoundItem";
import { soundsData } from "@/data/soundsData";

const SoundCategory = () => {
  const navigate = useNavigate();
  const { categoryId, subcategoryId } = useParams<{ categoryId: string; subcategoryId: string }>();
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);

  // Handle both categories and subcategories
  const isSubcategory = subcategoryId !== undefined;
  const category = isSubcategory 
    ? soundsData.subcategories[subcategoryId as keyof typeof soundsData.subcategories]
    : soundsData.categories[categoryId as keyof typeof soundsData.categories];
  
  if (!category) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">
            {isSubcategory ? 'Subcategoria' : 'Categoria'} não encontrada
          </h2>
          <Button onClick={() => navigate('/sounds')}>
            Voltar às categorias
          </Button>
        </div>
      </div>
    );
  }

  const togglePlay = (trackId: string) => {
    if (playingTrack === trackId) {
      setPlayingTrack(null);
    } else {
      setPlayingTrack(trackId);
    }
  };

  const playPlaylist = () => {
    const id = isSubcategory ? subcategoryId : categoryId;
    navigate(`/sounds/player/playlist/${id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-blue-50/30">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-4 p-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/sounds')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-foreground">{category.title}</h1>
            <p className="text-sm text-muted-foreground">
              {(category as any).description || `${category.sounds.length} sons disponíveis`}
            </p>
          </div>
        </div>

        {/* Playlist Button */}
        <div className="px-4 pb-4">
          <Button 
            onClick={playPlaylist}
            className="w-full bg-gradient-to-r from-sounds-primary to-sounds-secondary hover:from-sounds-primary/90 hover:to-sounds-secondary/90 text-white"
          >
            <ListMusic className="w-4 h-4 mr-2" />
            Escutar Playlist ({category.sounds.length} sons)
          </Button>
        </div>
      </div>

      {/* Sound List */}
      <div className="bg-card border-t border-border">
        <div className="divide-y divide-border">
          {category.sounds.map((sound) => (
            <SoundItem
              key={sound.id}
              sound={sound}
              onClick={() => navigate(`/sounds/player/${sound.id}`)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default SoundCategory;