import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Crown, Calendar, Clock, User as UserIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Profile = () => {
  const navigate = useNavigate();

  const consultationHistory = [
    {
      id: 1,
      psychologist: "Dr. Ana Silva",
      date: "2024-01-20",
      time: "14:00",
      duration: "50 min",
      type: "Emergência"
    },
    {
      id: 2,
      psychologist: "Dr. Carlos Santos",
      date: "2024-01-15",
      time: "10:00",
      duration: "45 min",
      type: "Consulta Regular"
    },
    {
      id: 3,
      psychologist: "Dra. Maria Oliveira",
      date: "2024-01-10",
      time: "16:30",
      duration: "60 min",
      type: "Consulta Regular"
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-border">
        <Button variant="ghost" size="sm" onClick={() => navigate('/home')}>
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-xl font-semibold text-foreground">Perfil</h1>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* User Info */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                <UserIcon className="text-primary" size={32} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">João Silva</h2>
                <p className="text-muted-foreground">joao.silva@email.com</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Plan */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="text-primary" size={20} />
              Plano Atual
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-foreground">Plano Grátis</div>
                <div className="text-sm text-muted-foreground">
                  • 1 consulta de emergência por mês
                </div>
                <div className="text-sm text-muted-foreground">
                  • Acesso limitado aos recursos
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-foreground">R$ 0</div>
                <div className="text-sm text-muted-foreground">/mês</div>
              </div>
            </div>
            
            <Button className="w-full" onClick={() => {/* TODO: implement upgrade */}}>
              <Crown size={16} className="mr-2" />
              Fazer Upgrade
            </Button>
            
            <div className="text-xs text-muted-foreground text-center">
              Plano Premium: R$ 49,90/mês
              <br />
              • Consultas ilimitadas • Acesso completo aos recursos
            </div>
          </CardContent>
        </Card>

        {/* Consultation History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="text-primary" size={20} />
              Histórico de Consultas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {consultationHistory.map((consultation) => (
              <div
                key={consultation.id}
                className="flex items-center justify-between p-3 rounded-lg bg-accent/50"
              >
                <div className="flex-1">
                  <div className="font-medium text-foreground">
                    {consultation.psychologist}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {consultation.type}
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div className="text-foreground">
                    {new Date(consultation.date).toLocaleDateString('pt-BR')}
                  </div>
                  <div className="text-muted-foreground flex items-center gap-1">
                    <Clock size={12} />
                    {consultation.time} • {consultation.duration}
                  </div>
                </div>
              </div>
            ))}
            
            {consultationHistory.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar size={32} className="mx-auto mb-2 opacity-50" />
                <p>Nenhuma consulta realizada ainda</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;