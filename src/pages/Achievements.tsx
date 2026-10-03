import { Check, Lock, Trophy } from 'lucide-react';
import { useAchievements } from '@/hooks/useAchievements';
import { AchievementModal } from '@/components/achievements/AchievementModal';
import { ACHIEVEMENT_GROUPS, achievementIcon } from '@/components/achievements/achievementIcons';
import { SkeletonCardGrid } from '@/components/skeletons/Skeletons';
import { Progress } from '@/components/ui/progress';
import PageHeader from '@/components/PageHeader';
import PatientBottomNav from '@/components/PatientBottomNav';
import { cn } from '@/lib/utils';

const formatDay = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

/** Minhas conquistas: progresso geral e conquistas por grupo (as desbloqueadas primeiro). */
const Achievements = () => {
  const { achievements, loading, newlyUnlocked, setNewlyUnlocked } = useAchievements();

  const achievedCount = achievements.filter((a) => a.achieved).length;
  const totalCount = achievements.length;
  const grouped = ACHIEVEMENT_GROUPS.map((group) => ({
    ...group,
    items: achievements
      .filter((a) => group.icons.includes(a.icon))
      .sort((a, b) => Number(b.achieved) - Number(a.achieved)),
  })).filter((group) => group.items.length > 0);
  const known = new Set(ACHIEVEMENT_GROUPS.flatMap((g) => g.icons));
  const others = achievements.filter((a) => !known.has(a.icon));
  if (others.length > 0) grouped.push({ title: 'Outras', icons: [], items: others });

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
              <section className="space-y-2 rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <Trophy className="h-5 w-5 text-primary" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold text-foreground">
                      {achievedCount} de {totalCount} desbloqueadas
                    </p>
                    <p className="text-sm text-muted-foreground">Cada conquista mostra o que falta para chegar lá.</p>
                  </div>
                </div>
                <Progress value={(achievedCount / totalCount) * 100} className="h-2" aria-label="Conquistas desbloqueadas" />
              </section>

              {grouped.map((group) => (
                <section key={group.title} className="space-y-2" aria-labelledby={`group-${group.title}`}>
                  <h2 id={`group-${group.title}`} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.title} · {group.items.filter((a) => a.achieved).length}/{group.items.length}
                  </h2>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {group.items.map((achievement) => {
                      const Icon = achievementIcon(achievement.icon);
                      return (
                        <li
                          key={achievement.id}
                          className={cn(
                            'flex items-start gap-3 rounded-2xl border p-3 shadow-sm',
                            achievement.achieved ? 'border-primary/30 bg-primary/5' : 'border-border bg-card',
                          )}
                        >
                          <span
                            className={cn(
                              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                              achievement.achieved ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                            )}
                          >
                            <Icon className="h-5 w-5" aria-hidden="true" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className={cn('font-semibold', achievement.achieved ? 'text-foreground' : 'text-muted-foreground')}>
                              {achievement.title}
                            </p>
                            <p className="text-sm text-muted-foreground">{achievement.description}</p>
                            <p className={cn('mt-1 flex items-center gap-1 text-xs', achievement.achieved ? 'text-primary' : 'text-muted-foreground')}>
                              {achievement.achieved ? (
                                <>
                                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                                  {achievement.achieved_at ? `Desbloqueada em ${formatDay(achievement.achieved_at)}` : 'Desbloqueada'}
                                </>
                              ) : (
                                <>
                                  <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                                  Bloqueada
                                </>
                              )}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </>
          )}
        </main>
      </div>
      <PatientBottomNav />

      {newlyUnlocked && (
        <AchievementModal
          isOpen={!!newlyUnlocked}
          onClose={() => setNewlyUnlocked(null)}
          title={newlyUnlocked.title}
          description={newlyUnlocked.description}
          icon={newlyUnlocked.icon}
        />
      )}
    </div>
  );
};

export default Achievements;
