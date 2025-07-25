import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home, Calendar, User, AlertTriangle, Music, Activity, BarChart3 } from "lucide-react";

const HomePage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Main Content */}
      <div className="flex-1 p-4 pb-20">
        <div className="max-w-md mx-auto space-y-6">
          {/* Header */}
          <div className="text-center py-4">
            <h1 className="text-2xl font-semibold text-foreground">CalmConnect</h1>
            <p className="text-muted-foreground">Bem-vindo de volta</p>
          </div>

          {/* SOS Button */}
          <div className="flex justify-center">
            <Button
              onClick={() => navigate('/sos')}
              className="w-32 h-32 rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-lg"
              size="lg"
            >
              <div className="flex flex-col items-center gap-2">
                <AlertTriangle size={32} />
                <span className="font-bold text-lg">SOS</span>
              </div>
            </Button>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 gap-4">
            <Card 
              className="cursor-pointer transition-all duration-300 hover:shadow-calm hover:scale-105"
              onClick={() => navigate('/sounds')}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Music className="text-primary" size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-card-foreground">Sons Relaxantes</h3>
                    <p className="text-sm text-muted-foreground">Ouça sons da natureza e músicas calmantes</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer transition-all duration-300 hover:shadow-calm hover:scale-105"
              onClick={() => navigate('/breathing')}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Activity className="text-primary" size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-card-foreground">Respiração Guiada</h3>
                    <p className="text-sm text-muted-foreground">Exercícios de respiração para relaxar</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer transition-all duration-300 hover:shadow-calm hover:scale-105"
              onClick={() => navigate('/statistics')}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <BarChart3 className="text-primary" size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-card-foreground">Minhas Estatísticas</h3>
                    <p className="text-sm text-muted-foreground">Acompanhe seu progresso</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border">
        <div className="flex justify-around py-3">
          <Button
            variant="ghost"
            className="flex flex-col items-center gap-1 text-primary"
            onClick={() => navigate('/home')}
          >
            <Home size={20} />
            <span className="text-xs">Home</span>
          </Button>
          <Button
            variant="ghost"
            className="flex flex-col items-center gap-1 text-muted-foreground"
            onClick={() => navigate('/appointments')}
          >
            <Calendar size={20} />
            <span className="text-xs">Consultas</span>
          </Button>
          <Button
            variant="ghost"
            className="flex flex-col items-center gap-1 text-muted-foreground"
            onClick={() => navigate('/profile')}
          >
            <User size={20} />
            <span className="text-xs">Perfil</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default HomePage;