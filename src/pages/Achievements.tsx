import { useNavigate } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import { useAchievements } from '@/hooks/useAchievements';
import { AchievementCard } from '@/components/achievements/AchievementCard';
import { AchievementModal } from '@/components/achievements/AchievementModal';
import { SkeletonCardGrid } from '@/components/skeletons/Skeletons';
import PageHeader from '@/components/PageHeader';
import PatientBottomNav from '@/components/PatientBottomNav';

const Achievements = () => {
  const navigate = useNavigate();
  const { achievements, loading, newlyUnlocked, setNewlyUnlocked } = useAchievements();

  const achievedCount = achievements.filter(a => a.achieved).length;
  const totalCount = achievements.length;

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-0">
      <PatientBottomNav />
      <PageHeader title="Minhas Conquistas" backTo="/statistics" />

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <SkeletonCardGrid count={6} />
        ) : achievements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
              <Trophy className="w-12 h-12 text-muted-foreground" />
            </div>
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
