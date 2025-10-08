import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Clock, Calendar, Activity, Zap, Wind, Music, Trophy, History } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePatientStatistics } from "@/hooks/usePatientStatistics";
import { useAchievements } from "@/hooks/useAchievements";
import { getRelativeTime, formatDateTime } from "@/utils/dateFormatters";

const Statistics = () => {
  const navigate = useNavigate();
  const { recentActivities, statistics, loading, updateStreak } = usePatientStatistics();
  const { checkAchievements } = useAchievements();

  // Update streak and check achievements when page loads (only once)
  useEffect(() => {
    const initializePage = async () => {
      await updateStreak();
      await checkAchievements();
    };
    
    initializePage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            onClick={() => navigate('/achievements')}
            className="w-full flex items-center justify-center gap-2"
            size="lg"
          >
            <Trophy size={20} />
            Ver Minhas Conquistas
          </Button>
          
          <Button
            onClick={() => navigate('/statistics/activity-history')}
            className="w-full flex items-center justify-center gap-2"
            size="lg"
            variant="outline"
          >
            <History size={20} />
            Ver Histórico de Atividades
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Carregando estatísticas...
          </div>
        ) : (
          <>
            {/* Overview Stats */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <Activity className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <div className="text-2xl font-bold text-primary">
                    {statistics?.total_scheduled_consultations || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Consultas Agendadas</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <Zap className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <div className="text-2xl font-bold text-primary">
                    {statistics?.total_emergency_consultations || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Consultas Emergenciais</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <Wind className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <div className="text-2xl font-bold text-primary">
                    {statistics?.total_guided_breathing_time || 0} min
                  </div>
                  <div className="text-sm text-muted-foreground">Respiração Guiada</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <Music className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <div className="text-2xl font-bold text-primary">
                    {statistics?.total_therapeutic_sound_time || 0} min
                  </div>
                  <div className="text-sm text-muted-foreground">Sons Terapêuticos</div>
                </CardContent>
              </Card>
            </div>

            {/* Streak Card */}
            <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
              <CardContent className="p-6 text-center">
                <div className="text-4xl mb-2">🔥</div>
                <div className="text-3xl font-bold text-primary mb-1">
                  {statistics?.streak_days || 0}
                </div>
                <div className="text-sm text-muted-foreground">
                  Dias consecutivos usando o app
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="text-primary" size={20} />
              Atividades Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando atividades...
              </div>
            ) : recentActivities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma atividade recente
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivities.map((activity, index) => (
                  <div
                    key={index}
                    className="flex flex-col gap-2 p-4 rounded-lg border bg-gradient-to-r from-muted/30 to-transparent"
                  >
                    <div className="flex items-start justify-between">
                      <p className="font-semibold text-base">{activity.name}</p>
                      <span className="text-sm font-medium text-primary flex items-center gap-1">
                        <Clock size={14} />
                        {getRelativeTime(activity.date)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar size={12} />
                      {formatDateTime(activity.date)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Statistics;