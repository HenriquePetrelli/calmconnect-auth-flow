import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Smile, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { usePatientMoodHistory } from '@/hooks/usePatientMoodHistory';
import { MOOD_OPTIONS, getMoodOptionByValue } from '@/components/MoodAccordion';

const TREND_COPY = {
  up: { Icon: TrendingUp, text: 'Seu humor está melhorando', color: 'text-success' },
  down: { Icon: TrendingDown, text: 'Seu humor tem caído — vale conversar com seu psicólogo', color: 'text-destructive' },
  stable: { Icon: Minus, text: 'Seu humor está estável', color: 'text-muted-foreground' },
} as const;

export const MoodTrendChart = () => {
  const { entries, loading, average, trend } = usePatientMoodHistory(30);

  return (
    <Card className="border-l-4 border-l-pink-400">
      <CardHeader className="bg-gradient-to-r from-pink-500/5 to-transparent">
        <CardTitle className="flex items-center gap-3">
          <div className="w-10 h-10 bg-pink-500/15 rounded-full flex items-center justify-center">
            <Smile className="text-pink-600" size={18} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">Evolução do humor</h3>
            <p className="text-sm text-muted-foreground font-normal">Últimos 30 dias</p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        {loading ? (
          <div className="h-40 bg-muted animate-pulse rounded-lg" />
        ) : entries.length === 0 ? (
          <div className="text-center py-6 space-y-2">
            <Smile className="w-8 h-8 mx-auto text-muted-foreground/50" />
            <p className="text-sm font-medium text-foreground">Ainda sem histórico de humor</p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Registre seu humor na tela inicial para começar a acompanhar sua evolução aqui.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={entries.map((e) => ({
                date: format(new Date(`${e.date}T00:00:00`), 'dd/MM', { locale: ptBR }),
                value: e.value,
              }))}>
                <defs>
                  <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} fontSize={11} tickLine={false} axisLine={false} width={24} />
                <Tooltip
                  formatter={(value: number) => [getMoodOptionByValue(value)?.label ?? value, 'Humor']}
                />
                <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="url(#moodGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {MOOD_OPTIONS.slice().reverse().map((m) => (
                <span key={m.value} className="flex items-center gap-1">
                  <m.Icon className={`w-3.5 h-3.5 ${m.colorClass}`} />
                  {m.label}
                </span>
              ))}
            </div>

            {(average !== null || trend) && (
              <div className="flex items-center justify-between text-sm pt-2 border-t">
                {average !== null && (
                  <span className="text-muted-foreground">
                    Média: <span className="font-semibold text-foreground">{average.toFixed(1)}/5</span>
                  </span>
                )}
                {trend && (
                  <span className={`flex items-center gap-1 font-medium ${TREND_COPY[trend].color}`}>
                    {(() => {
                      const { Icon } = TREND_COPY[trend];
                      return <Icon className="w-4 h-4" />;
                    })()}
                    {TREND_COPY[trend].text}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MoodTrendChart;
