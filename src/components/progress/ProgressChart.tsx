import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { usePatientProgress } from '@/hooks/usePatientProgress';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingDown, TrendingUp, Activity, Clock } from 'lucide-react';

export const ProgressChart = () => {
  const { progress, stats, loading } = usePatientProgress();

  if (loading) {
    return (
      <div className="grid gap-6">
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const chartData = progress.map((entry) => ({
    date: format(new Date(entry.session_date), 'dd/MM', { locale: ptBR }),
    ansiedade: entry.anxiety_level || 0,
    estresse: entry.stress_level || 0,
    humor: entry.mood_rating || 0,
  }));

  const techniqueData = stats?.techniquesUsed.map((technique) => ({
    technique,
    count: progress.filter(p => p.technique_used === technique).length,
  })) || [];

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Sessões</p>
                <p className="text-2xl font-bold">{stats?.totalSessions || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingDown className="h-4 w-4 text-success" />
              <div>
                <p className="text-sm text-muted-foreground">Ansiedade Média</p>
                <p className="text-2xl font-bold">
                  {stats?.averageAnxiety.toFixed(1) || '0.0'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-secondary" />
              <div>
                <p className="text-sm text-muted-foreground">Humor Médio</p>
                <p className="text-2xl font-bold">
                  {stats?.averageMood.toFixed(1) || '0.0'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-secondary" />
              <div>
                <p className="text-sm text-muted-foreground">Tempo Total</p>
                <p className="text-2xl font-bold">
                  {Math.round((stats?.totalDuration || 0) / 60)}h
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Line Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução dos Níveis</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[1, 10]} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="ansiedade"
                stroke="#ef4444"
                strokeWidth={2}
                name="Ansiedade"
              />
              <Line
                type="monotone"
                dataKey="estresse"
                stroke="#f97316"
                strokeWidth={2}
                name="Estresse"
              />
              <Line
                type="monotone"
                dataKey="humor"
                stroke="#22c55e"
                strokeWidth={2}
                name="Humor"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Techniques Used */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Técnicas Mais Utilizadas</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={techniqueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="technique" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Técnicas Praticadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {stats?.techniquesUsed.map((technique, index) => (
                <Badge key={index} variant="secondary">
                  {technique}
                </Badge>
              )) || (
                <p className="text-muted-foreground">
                  Nenhuma técnica registrada ainda
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};