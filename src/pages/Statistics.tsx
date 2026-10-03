import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  BarChart3,
  BookOpen,
  ChevronRight,
  ClipboardList,
  Clock,
  Flame,
  History,
  Music,
  Sprout,
  Trophy,
  Users,
  Wind,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePatientStatistics } from "@/hooks/usePatientStatistics";
import { useAchievements } from "@/hooks/useAchievements";
import { usePatientEngagementMetrics } from "@/hooks/usePatientEngagementMetrics";
import { useActivityFeed } from "@/hooks/useActivityFeed";
import { useHabits } from "@/hooks/useHabits";
import { useScreenings } from "@/hooks/useScreenings";
import WeeklyGoalsSection from "@/components/goals/WeeklyGoalsSection";
import { MoodTrendChart } from "@/components/progress/MoodTrendChart";
import InsightsCard from "@/components/progress/InsightsCard";
import QuestionnairesCard from "@/components/progress/QuestionnairesCard";
import FeedList from "@/components/progress/FeedList";
import { ProgressSection, ProgressTile } from "@/components/progress/ProgressSection";
import { SkeletonList } from "@/components/skeletons/Skeletons";

/**
 * Meu Progresso, de cima para baixo:
 * 1. atalhos (sequência, conquistas, questionários, histórico), todos iguais;
 * 2. como estou (humor e padrões);
 * 3. o que estou praticando (metas da semana);
 * 4. números (visão geral) e o que fiz por último.
 */
const Statistics = () => {
  const navigate = useNavigate();
  const { statistics, loading, updateStreak } = usePatientStatistics();
  const { achievements, loading: achievementsLoading, checkAchievements, unlockAchievement } = useAchievements();
  const { journalEntriesCount, supportGroupParticipationCount, appointmentCompletionRate, loading: engagementLoading } =
    usePatientEngagementMetrics();
  const { items: feed, loading: feedLoading } = useActivityFeed();
  const { habits } = useHabits();
  const { history: screenings } = useScreenings();

  useEffect(() => {
    const init = async () => {
      await updateStreak();
      await checkAchievements();
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // "Seus Padrões": desbloqueia quando aparece o primeiro padrão (depois de as conquistas carregarem).
  const [insightFound, setInsightFound] = useState(false);
  useEffect(() => {
    if (insightFound && !achievementsLoading) void unlockAchievement("Seus Padrões");
  }, [insightFound, achievementsLoading, unlockAchievement]);

  const achievedCount = achievements.filter((a) => a.achieved).length;
  const streak = statistics?.streak_days || 0;

  const statCards = [
    {
      icon: Activity,
      value: statistics?.total_scheduled_consultations || 0,
      label: "Consultas",
      sublabel: appointmentCompletionRate !== null ? `${appointmentCompletionRate}% de comparecimento` : undefined,
    },
    { icon: Zap, value: statistics?.total_emergency_consultations || 0, label: "Atendimentos SOS" },
    { icon: Wind, value: `${statistics?.total_guided_breathing_time || 0} min`, label: "Respiração guiada" },
    { icon: Music, value: `${statistics?.total_therapeutic_sound_time || 0} min`, label: "Sons terapêuticos" },
    { icon: BookOpen, value: journalEntriesCount, label: "Anotações no diário" },
    { icon: Users, value: supportGroupParticipationCount, label: "Grupos de apoio" },
    { icon: Sprout, value: habits.length, label: "Hábitos acompanhados" },
    { icon: ClipboardList, value: screenings.length, label: "Questionários respondidos" },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Atalhos */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2" aria-label="Resumo">
        {loading ? (
          <Skeleton className="h-[74px] w-full rounded-2xl" />
        ) : (
          <ProgressTile
            icon={Flame}
            title={`${streak} ${streak === 1 ? "dia seguido" : "dias seguidos"}`}
            subtitle={streak > 0 ? "Continue firme na sua jornada" : "Use o app hoje para começar a sequência"}
          />
        )}
        <ProgressTile
          icon={Trophy}
          title="Minhas conquistas"
          subtitle={achievementsLoading ? "Veja suas conquistas" : `${achievedCount} de ${achievements.length} desbloqueadas`}
          onClick={() => navigate("/achievements")}
        />
        <QuestionnairesCard />
        <ProgressTile
          icon={History}
          title="Histórico completo"
          subtitle="Atividades, hábitos e questionários"
          onClick={() => navigate("/statistics/activity-history")}
        />
      </section>

      {/* 2. Como estou */}
      <MoodTrendChart />
      <InsightsCard onInsightFound={() => setInsightFound(true)} />

      {/* 3. O que estou praticando */}
      <WeeklyGoalsSection />

      {/* 4. Números e o que fiz por último */}
      <ProgressSection icon={BarChart3} title="Visão geral" subtitle="Suas atividades no app">
        {loading || engagementLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl border bg-muted/40" />
            ))}
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {statCards.map((s) => (
              <li key={s.label} className="min-w-0 rounded-xl border border-border bg-card p-3">
                <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <s.icon className="h-[18px] w-[18px] text-primary" aria-hidden="true" />
                </span>
                <p className="text-xl font-semibold leading-none tabular-nums text-foreground">{s.value}</p>
                <p className="mt-1.5 break-words text-xs leading-snug text-muted-foreground">{s.label}</p>
                {s.sublabel && <p className="mt-0.5 break-words text-xs font-medium leading-snug text-primary">{s.sublabel}</p>}
              </li>
            ))}
          </ul>
        )}
      </ProgressSection>

      <ProgressSection
        icon={Clock}
        title="Atividades recentes"
        subtitle="O que você fez por último"
        action={
          feed.length > 0 ? (
            <Button variant="ghost" size="sm" className="gap-1 text-primary" onClick={() => navigate("/statistics/activity-history")}>
              Ver tudo
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          ) : undefined
        }
      >
        {feedLoading ? (
          <SkeletonList count={4} />
        ) : feed.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma atividade ainda. Que tal uma respiração guiada?</p>
        ) : (
          <FeedList items={feed.slice(0, 5)} relative />
        )}
      </ProgressSection>
    </div>
  );
};

export default Statistics;
