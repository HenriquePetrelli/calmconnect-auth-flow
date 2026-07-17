import { motion } from 'framer-motion';
import { Lock, Check, User as UserIcon, Wind, NotebookPen, MessageCircle, BarChart3, PartyPopper, Trophy } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface AchievementCardProps {
  title: string;
  description: string;
  icon: string;
  achieved: boolean;
  achieved_at: string | null;
}

// Map icon names to Lucide icon components
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  undraw_meditation: UserIcon,
  undraw_yoga: Wind,
  undraw_note_list: NotebookPen,
  undraw_chat: MessageCircle,
  undraw_profile_data: BarChart3,
  undraw_celebration: PartyPopper,
};

export const AchievementCard = ({
  title,
  description,
  icon,
  achieved,
  achieved_at,
}: AchievementCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        className={`relative overflow-hidden transition-all duration-300 ${
          achieved
            ? 'border-primary bg-gradient-to-br from-primary/10 to-primary/5'
            : 'opacity-60 grayscale'
        }`}
      >
        <CardContent className="p-6">
          <div className="flex flex-col items-center text-center space-y-4">
            {/* Icon */}
            <div className={achieved ? 'animate-bounce' : ''}>
              {(() => {
                const IconComp = iconMap[icon] || Trophy;
                return <IconComp className="w-16 h-16 text-primary" />;
              })()}
            </div>

            {/* Status Badge */}
            <div
              className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
                achieved
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {achieved ? (
                <>
                  <Check size={14} />
                  Desbloqueada
                </>
              ) : (
                <>
                  <Lock size={14} />
                  Bloqueada
                </>
              )}
            </div>

            {/* Title & Description */}
            <div className="space-y-2">
              <h3 className="font-bold text-lg text-foreground">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>

            {/* Achievement Date */}
            {achieved && achieved_at && (
              <p className="text-xs text-muted-foreground">
                Conquistada em{' '}
                {new Date(achieved_at).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
