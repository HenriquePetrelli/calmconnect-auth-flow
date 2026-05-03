import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, Moon, Brain, Target, Leaf, Music, Waves, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import CategoryCard from "@/components/sounds/CategoryCard";
import PlaylistCard from "@/components/sounds/PlaylistCard";
import PatientBottomNav from "@/components/PatientBottomNav";

const SoundsLibrary = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const mainCategories = [
    {
      id: "sleep",
      icon: <Moon className="w-8 h-8" />,
      title: "Para Dormir",
      description: "Sons que induzem relaxamento profundo e sono reparador",
      gradient: "from-secondary to-secondary-hover",
      sounds: 12
    },
    {
      id: "meditate", 
      icon: <Brain className="w-8 h-8" />,
      title: "Para Meditar",
      description: "Paisagens sonoras para meditação e mindfulness",
      gradient: "from-green-500 to-teal-600",
      sounds: 8
    },
    {
      id: "focus",
      icon: <Target className="w-8 h-8" />,
      title: "Para Focar",
      description: "Ambiente sonoro ideal para concentração e produtividade",
      gradient: "from-primary to-red-600", 
      sounds: 6
    }
  ];

  const subCategories = [
    {
      id: "nature",
      icon: <Leaf className="w-6 h-6" />,
      title: "Sons da Natureza",
      count: 15
    },
    {
      id: "instrumental",
      icon: <Music className="w-6 h-6" />,
      title: "Músicas Instrumentais", 
      count: 12
    },
    {
      id: "therapeutic",
      icon: <Waves className="w-6 h-6" />,
      title: "Tons Terapêuticos",
      count: 8
    },
    {
      id: "meditation",
      icon: <Heart className="w-6 h-6" />,
      title: "Meditação e Mantras",
      count: 10
    }
  ];

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-0">
      <PatientBottomNav />
      {/* Header */}
      <div className="flex items-center gap-4 p-4 bg-white/80 backdrop-blur-sm border-b border-border">
        <Button variant="ghost" size="sm" onClick={() => navigate('/home')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-semibold text-foreground">Biblioteca de Sons</h1>
      </div>

      <div className="p-6 space-y-8">
        {/* Search Input */}
        <div className="relative max-w-md mx-auto">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Busque um som (ex.: chuva, 432 Hz)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/80 border-border"
          />
        </div>

        {/* Main Categories */}
        <div className="space-y-4">
          <h2 className="text-xl font-medium text-foreground">Categorias Principais</h2>
          <div className="space-y-3">
            {mainCategories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                type="main"
                onClick={() => navigate(`/sounds/category/${category.id}`)}
              />
            ))}
          </div>
        </div>

        {/* Playlists Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-medium text-foreground">Playlists</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subCategories.map((category) => (
              <PlaylistCard
                key={category.id}
                title={category.title}
                count={`${category.count} opções`}
                onClick={() => navigate(`/sounds/subcategory/${category.id}`)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SoundsLibrary;