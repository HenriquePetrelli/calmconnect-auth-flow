import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, Pause, Clock, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const SoundsLibrary = () => {
  const navigate = useNavigate();
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);

  const soundData = {
    nature: [
      { id: "1", name: "Chuva Suave", duration: "15:00" },
      { id: "2", name: "Ondas do Mar", duration: "20:00" },
      { id: "3", name: "Floresta Tropical", duration: "18:00" },
      { id: "4", name: "Vento nas Árvores", duration: "12:00" },
    ],
    music: [
      { id: "5", name: "Piano Relaxante", duration: "25:00" },
      { id: "6", name: "Música Ambiente", duration: "30:00" },
      { id: "7", name: "Sons Tibetanos", duration: "22:00" },
      { id: "8", name: "Harpa Celestial", duration: "28:00" },
    ],
    frequencies: [
      { id: "9", name: "432Hz - Harmonia", duration: "60:00" },
      { id: "10", name: "528Hz - Amor", duration: "45:00" },
      { id: "11", name: "741Hz - Limpeza", duration: "40:00" },
      { id: "12", name: "963Hz - Despertar", duration: "50:00" },
    ],
  };

  const togglePlay = (trackId: string) => {
    if (playingTrack === trackId) {
      setPlayingTrack(null);
    } else {
      setPlayingTrack(trackId);
    }
  };

  const SoundCard = ({ sound }: { sound: { id: string; name: string; duration: string } }) => (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="font-medium text-card-foreground">{sound.name}</h3>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock size={14} />
              <span>{sound.duration}</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => togglePlay(sound.id)}
            className="text-primary hover:text-primary/80"
          >
            {playingTrack === sound.id ? <Pause size={20} /> : <Play size={20} />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-border">
        <Button variant="ghost" size="sm" onClick={() => navigate('/home')}>
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-xl font-semibold text-foreground">Biblioteca de Sons</h1>
      </div>

      {/* Content */}
      <div className="p-4">
        <Tabs defaultValue="nature" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="nature">Natureza</TabsTrigger>
            <TabsTrigger value="music">Música</TabsTrigger>
            <TabsTrigger value="frequencies">Frequências</TabsTrigger>
          </TabsList>

          <TabsContent value="nature" className="mt-6">
            <div className="space-y-1">
              {soundData.nature.map((sound) => (
                <SoundCard key={sound.id} sound={sound} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="music" className="mt-6">
            <div className="space-y-1">
              {soundData.music.map((sound) => (
                <SoundCard key={sound.id} sound={sound} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="frequencies" className="mt-6">
            <div className="space-y-1">
              {soundData.frequencies.map((sound) => (
                <SoundCard key={sound.id} sound={sound} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SoundsLibrary;