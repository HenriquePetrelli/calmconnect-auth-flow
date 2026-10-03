import { toast } from 'sonner';
import AchievementToast, { type CelebratedAchievement } from './AchievementToast';

/** Comemora uma conquista em qualquer tela (o id evita toast repetido para a mesma conquista). */
export const celebrateAchievement = (achievement: CelebratedAchievement) => {
  toast.custom((id) => <AchievementToast achievement={achievement} onClose={() => toast.dismiss(id)} />, {
    id: `achievement-${achievement.title}`,
    duration: 6000,
    position: 'top-center',
  });
};
