import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, BarChart3, TrendingUp, Clock, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Statistics = () => {
  const navigate = useNavigate();

  const stats = {
    totalSessions: 15,
    thisMonth: 4,
    averageRating: 4.8,
    totalHours: 12.5,
    streak: 7,
    improvements: [
      { area: "Ansiedade", progress: 75, trend: "up" },
      { area: "Sono", progress: 60, trend: "up" },
      { area: "Humor", progress: 80, trend: "up" },
      { area: "Stress", progress: 45, trend: "down" },
    ]
  };

  const recentActivities = [
    { date: "2024-01-20", activity: "Respiração Guiada", duration: "15 min" },
    { date: "2024-01-19", activity: "Sons Relaxantes", duration: "30 min" },
    { date: "2024-01-18", activity: "Consulta com Dr. Ana", duration: "50 min" },
    { date: "2024-01-17", activity: "Respiração Guiada", duration: "10 min" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-border">
        <Button variant="ghost" size="sm" onClick={() => navigate('/home')}>
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-xl font-semibold text-foreground">Minhas Estatísticas</h1>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{stats.totalSessions}</div>
              <div className="text-sm text-muted-foreground">Total de Sessões</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{stats.thisMonth}</div>
              <div className="text-sm text-muted-foreground">Este Mês</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{stats.totalHours}h</div>
              <div className="text-sm text-muted-foreground">Tempo Total</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{stats.streak}</div>
              <div className="text-sm text-muted-foreground">Dias Seguidos</div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Areas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="text-primary" size={20} />
              Áreas de Melhoria
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.improvements.map((item) => (
              <div key={item.area} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{item.area}</span>
                  <span className="text-sm text-muted-foreground">{item.progress}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${
                      item.trend === 'up' ? 'bg-green-500' : 'bg-primary'
                    }`}
                    style={{ width: `${item.progress}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Weekly Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="text-primary" size={20} />
              Resumo da Semana
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sessões de Respiração</span>
                <span className="font-medium text-foreground">8</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tempo com Sons</span>
                <span className="font-medium text-foreground">2h 30min</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Consultas</span>
                <span className="font-medium text-foreground">1</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Avaliação Média</span>
                <span className="font-medium text-foreground">⭐ {stats.averageRating}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="text-primary" size={20} />
              Atividades Recentes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentActivities.map((activity, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg bg-accent/50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary"></div>
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {activity.activity}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(activity.date).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {activity.duration}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Statistics;