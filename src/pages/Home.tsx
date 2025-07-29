import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Home, Calendar, User, Waves, Volume2, TrendingUp, Users, Lock } from "lucide-react";
import FeatureCard from "@/components/FeatureCard";
import SOSButton from "@/components/SOSButton";

const HomePage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background relative">
      {/* Main Content */}
      <div className="flex-1 p-4 pb-24">
        <div className="max-w-md mx-auto space-y-6">
          {/* Header */}
          <div className="text-center py-6">
            <h1 className="text-3xl font-bold text-foreground mb-2 animate-fade-in">CalmConnect</h1>
            <p className="text-muted-foreground">Bem-vindo de volta</p>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 gap-5">
            {/* Respiração Guiada */}
            <FeatureCard
              icon={<Waves className="text-white" size={28} />}
              title="Respiração Guiada"
              description="Respiração consciente, respiração tática, respiração 4-7-8, respiração coerente e respiração alternada"
              iconClassName="bg-breathing-primary hover:bg-breathing-secondary"
              onClick={() => navigate('/breathing')}
            />

            {/* Sons Relaxantes */}
            <FeatureCard
              icon={<Volume2 className="text-white" size={28} />}
              title="Sons Relaxantes"
              description="Sons de natureza, música instrumental, frequências, tons terapêuticos, meditação e mantras"
              iconClassName="bg-sounds-primary hover:bg-sounds-secondary"
              onClick={() => navigate('/sounds')}
            />

            {/* Minha Evolução */}
            <FeatureCard
              icon={<TrendingUp className="text-white" size={28} />}
              title="Minha Evolução"
              description="Acompanhe suas estatísticas em tempo real de acordo com sua evolução"
              iconClassName="bg-gradient-to-br from-evolution-primary to-evolution-secondary"
              badge={
                <Badge className="bg-evolution-primary text-white text-xs px-2 py-1">
                  3
                </Badge>
              }
              onClick={() => navigate('/statistics')}
            />

            {/* Aulas de Yoga - Desabilitado */}
            <FeatureCard
              icon={
                <div className="relative">
                  <Users className="text-gray-400" size={28} />
                  <Lock className="absolute -bottom-1 -right-1 w-4 h-4 text-gray-500" />
                </div>
              }
              title="Aulas de Yoga"
              description="Em breve disponível"
              iconClassName="bg-yoga-disabled"
              badge={
                <Badge variant="secondary" className="text-xs px-2 py-1">
                  EM BREVE
                </Badge>
              }
              disabled={true}
            />
          </div>
        </div>
      </div>

      {/* SOS Button - Floating */}
      <SOSButton />

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