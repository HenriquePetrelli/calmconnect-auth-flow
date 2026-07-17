import { Button } from '@/components/ui/button';
import { ArrowLeft, Sprout } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAchievements } from '@/hooks/useAchievements';
import { AchievementCard } from '@/components/achievements/AchievementCard';
import { AchievementModal } from '@/components/achievements/AchievementModal';

const Achievements = () => {
  const navigate = useNavigate();
  const { achievements, loading, newlyUnlocked, setNewlyUnlocked } = useAchievements();

  const achievedCount = achievements.filter(a => a.achieved).length;
  const totalCount = achievements.length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-border">
        <Button variant="ghost" size="sm" onClick={() => navigate('/statistics')}>
          <ArrowLeft size={20} />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-foreground">Minhas Conquistas</h1>
          <p className="text-sm text-muted-foreground">
            {achievedCount} de {totalCount} desbloqueadas
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Carregando conquistas...
          </div>
        ) : achievements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="text-6xl">🌱</div>
            <h2 className="text-xl font-semibold text-foreground">
              Nenhuma conquista ainda
            </h2>
            <p className="text-muted-foreground text-center max-w-md">
              Continue cuidando de si mesmo e desbloqueie conquistas ao completar
              atividades no aplicativo!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {achievements.map((achievement) => (
              <AchievementCard
                key={achievement.id}
                title={achievement.title}
                description={achievement.description}
                icon={achievement.icon}
                achieved={achievement.achieved}
                achieved_at={achievement.achieved_at}
              />
            ))}
          </div>
        )}
      </div>

      {/* Achievement Unlock Modal */}
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
