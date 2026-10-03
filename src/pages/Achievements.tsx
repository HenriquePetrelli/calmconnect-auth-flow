import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Sparkles, Trophy } from 'lucide-react';
import { useAchievements } from '@/hooks/useAchievements';
import AchievementMedal from '@/components/achievements/AchievementMedal';
import { ACHIEVEMENT_GROUPS, achievementTheme } from '@/components/achievements/achievementIcons';
import type { AchievementProgress } from '@/lib/achievementRules';
import { SkeletonCardGrid } from '@/components/skeletons/Skeletons';
import PageHeader from '@/components/PageHeader';
import PatientBottomNav from '@/components/PatientBottomNav';
import { cn } from '@/lib/utils';

const formatDay = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

/** Níveis pela fração desbloqueada: a jornada cresce como uma planta. */
const LEVELS = [
  { min: 0, name: 'Semente', emoji: '🌱' },
  { min: 0.2, name: 'Broto', emoji: '🌿' },
  { min: 0.4, name: 'Florescendo', emoji: '🌸' },
  { min: 0.6, name: 'Árvore forte', emoji: '🌳' },
  { min: 0.9, name: 'Floresta', emoji: '🏞️' },
];

const levelFor = (achieved: number, total: number) => {
  const ratio = total > 0 ? achieved / total : 0;
  const index = LEVELS.reduce((found, level, i) => (ratio >= level.min ? i : found), 0);
  const next = LEVELS[index + 1];
  const toNext = next ? Math.max(1, Math.ceil(next.min * total) - achieved) : 0;
  return { ...LEVELS[index], number: index + 1, next, toNext };
};

const ProgressLine = ({ progress, color }: { progress: AchievementProgress; color: string }) => (
  <div className="w-full space-y-1">
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${(progress.current / progress.target) * 100}%`, backgroundColor: color }}
      />
    </div>
    <p className="text-xs tabular-nums text-muted-foreground">
      {progress.current} de {progress.target}
      {progress.unit ? ` ${progress.unit}` : ''}
    </p>
  </div>
);

/** Minhas conquistas: nível, as mais perto de desbloquear e as medalhas por tema. */
const Achievements = () => {
  const { achievements, loading, progress, checkAchievements } = useAchievements();
  const reduce = useReducedMotion();

  // Ao abrir: confere o que já dá para desbloquear e calcula o progresso de cada uma.
  const checked = useRef(false);
  useEffect(() => {
    if (loading || checked.current || achievements.length === 0) return;
    checked.current = true;
    void checkAchievements();
  }, [loading, achievements.length, checkAchievements]);

  const achievedCount = achievements.filter((a) => a.achieved).length;
  const totalCount = achievements.length;
  const level = levelFor(achievedCount, totalCount);

  const grouped = ACHIEVEMENT_GROUPS.map((group) => ({
    ...group,
    items: achievements
      .filter((a) => group.icons.includes(a.icon))
      .sort((a, b) => Number(b.achieved) - Number(a.achieved)),
  })).filter((group) => group.items.length > 0);
  const known = new Set(ACHIEVEMENT_GROUPS.flatMap((g) => g.icons));
  const others = achievements.filter((a) => !known.has(a.icon));

  // "Quase lá": as bloqueadas com mais progresso (até 3).
  const almost = achievements
    .filter((a) => !a.achieved && progress[a.title] && progress[a.title].current > 0)
    .sort((a, b) => {
      const pa = progress[a.title];
      const pb = progress[b.title];
      return pb.current / pb.target - pa.current / pa.target;
    })
    .slice(0, 3);

  const appear = (i: number) =>
    reduce ? {} : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { delay: Math.min(i, 12) * 0.03 } };

  return (
    <div className="has-tabs">
      <div className="screen">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
          <PageHeader title="Minhas conquistas" backTo="/statistics" />
        </div>

        <main className="mx-auto w-full max-w-3xl space-y-6 p-4">
          {loading ? (
            <SkeletonCardGrid count={6} />
          ) : totalCount === 0 ? (
            <div className="flex flex-col items-center justify-center space-y-3 py-12 text-center">
              <Trophy className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-foreground">Nenhuma conquista ainda</h2>
              <p className="max-w-md text-sm text-muted-foreground">
                Continue cuidando de você: as conquistas chegam com as atividades do app.
              </p>
            </div>
          ) : (
            <>
              {/* Nível */}
              <section
                className="relative overflow-hidden rounded-3xl p-5 text-white shadow-lg"
                style={{ backgroundImage: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 55%, #F97316 120%)' }}
              >
                <span className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-white/10" aria-hidden="true" />
                <span className="pointer-events-none absolute -bottom-12 right-16 h-28 w-28 rounded-full bg-white/10" aria-hidden="true" />
                <div className="relative flex items-center gap-4">
                  <motion.span
                    className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-4xl backdrop-blur-sm"
                    animate={reduce ? undefined : { y: [0, -4, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    aria-hidden="true"
                  >
                    {level.emoji}
                  </motion.span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-white/80">Nível {level.number}</p>
                    <h2 className="text-2xl font-bold leading-tight">{level.name}</h2>
                    <p className="text-sm text-white/85">
                      {achievedCount} de {totalCount} conquistas
                    </p>
                  </div>
                </div>
                <div className="relative mt-4 h-2.5 overflow-hidden rounded-full bg-white/25">
                  <motion.div
                    className="h-full rounded-full bg-white"
                    initial={reduce ? false : { width: 0 }}
                    animate={{ width: `${(achievedCount / totalCount) * 100}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
                <p className="relative mt-2 text-sm text-white/90">
                  {level.next
                    ? `Mais ${level.toNext} ${level.toNext === 1 ? 'conquista' : 'conquistas'} para virar ${level.next.name} ${level.next.emoji}`
                    : 'Você chegou ao último nível. Que jornada!'}
                </p>
              </section>

              {/* Quase lá */}
              {almost.length > 0 && (
                <section className="space-y-2" aria-labelledby="almost-title">
                  <h2 id="almost-title" className="flex items-center gap-1.5 text-base font-semibold text-foreground">
                    <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
                    Quase lá
                  </h2>
                  <ul className="space-y-2">
                    {almost.map((achievement, i) => {
                      const theme = achievementTheme(achievement.icon);
                      return (
                        <motion.li
                          key={achievement.id}
                          {...appear(i)}
                          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm"
                        >
                          <AchievementMedal icon={achievement.icon} achieved={false} size="sm" />
                          <div className="min-w-0 flex-1 space-y-1">
                            <p className="break-words font-semibold text-foreground">{achievement.title}</p>
                            <p className="break-words text-xs text-muted-foreground">{achievement.description}</p>
                            <ProgressLine progress={progress[achievement.title]} color={theme.to} />
                          </div>
                        </motion.li>
                      );
                    })}
                  </ul>
                </section>
              )}

              {/* Medalhas por tema */}
              {[...grouped, ...(others.length > 0 ? [{ title: 'Outras', emoji: '⭐', icons: [], items: others }] : [])].map(
                (group) => (
                  <section key={group.title} className="space-y-3" aria-labelledby={`group-${group.title}`}>
                    <div className="flex items-center justify-between gap-2">
                      <h2 id={`group-${group.title}`} className="text-base font-semibold text-foreground">
                        <span aria-hidden="true">{group.emoji}</span> {group.title}
                      </h2>
                      <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                        {group.items.filter((a) => a.achieved).length}/{group.items.length}
                      </span>
                    </div>
                    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {group.items.map((achievement, i) => {
                        const theme = achievementTheme(achievement.icon);
                        const itemProgress = progress[achievement.title];
                        return (
                          <motion.li
                            key={achievement.id}
                            {...appear(i)}
                            className={cn(
                              'flex min-w-0 flex-col items-center gap-2 rounded-2xl border p-3 text-center shadow-sm',
                              achievement.achieved ? 'border-transparent' : 'border-border bg-card',
                            )}
                            style={achievement.achieved ? { backgroundColor: theme.soft, borderColor: `${theme.to}40` } : undefined}
                          >
                            <AchievementMedal icon={achievement.icon} achieved={achievement.achieved} />
                            <p
                              className={cn(
                                'break-words text-sm font-semibold leading-snug',
                                achievement.achieved ? 'text-foreground' : 'text-foreground/80',
                              )}
                            >
                              {achievement.title}
                            </p>
                            <p className="break-words text-xs leading-snug text-muted-foreground">{achievement.description}</p>
                            <div className="mt-auto w-full pt-1">
                              {achievement.achieved ? (
                                <span
                                  className="inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
                                  style={{ backgroundColor: theme.to }}
                                >
                                  {achievement.achieved_at ? formatDay(achievement.achieved_at) : 'Desbloqueada'}
                                </span>
                              ) : itemProgress ? (
                                <ProgressLine progress={itemProgress} color={theme.to} />
                              ) : (
                                <span className="text-xs font-medium text-muted-foreground">Ainda não</span>
                              )}
                            </div>
                          </motion.li>
                        );
                      })}
                    </ul>
                  </section>
                ),
              )}
            </>
          )}
        </main>
      </div>
      <PatientBottomNav />
    </div>
  );
};

export default Achievements;
