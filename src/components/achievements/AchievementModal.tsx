import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';
import { useWindowSize } from '@/hooks/use-window-size';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { User as UserIcon, Wind, NotebookPen, MessageCircle, BarChart3, PartyPopper, Trophy, Music2, Headphones } from 'lucide-react';

interface AchievementModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  icon: string;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  undraw_meditation: UserIcon,
  undraw_yoga: Wind,
  undraw_note_list: NotebookPen,
  undraw_chat: MessageCircle,
  undraw_profile_data: BarChart3,
  undraw_celebration: PartyPopper,
  undraw_music: Music2,
  undraw_headphones: Headphones,
};

export const AchievementModal = ({
  isOpen,
  onClose,
  title,
  description,
  icon,
}: AchievementModalProps) => {
  const { width, height } = useWindowSize();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <AnimatePresence>
          {isOpen && (
            <>
              {/* Confetti */}
              <Confetti
                width={width || 400}
                height={height || 600}
                recycle={false}
                numberOfPieces={200}
                gravity={0.3}
              />

              {/* Content */}
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ type: 'spring', damping: 15, stiffness: 300 }}
                className="flex flex-col items-center text-center space-y-6 py-6"
              >
                {/* Icon */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{
                    delay: 0.2,
                    type: 'spring',
                    damping: 10,
                    stiffness: 200,
                  }}
                >
                  {(() => {
                    const IconComp = iconMap[icon] || Trophy;
                    return <IconComp className="w-24 h-24 text-primary" />;
                  })()}
                </motion.div>

                {/* Badge */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-2xl font-bold text-primary inline-flex items-center gap-2"
                >
                  <PartyPopper className="w-6 h-6" />
                  Parabéns!
                  <PartyPopper className="w-6 h-6" />
                </motion.div>

                {/* Title */}
                <motion.h2
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-2xl font-bold text-foreground"
                >
                  {title}
                </motion.h2>

                {/* Description */}
                <motion.p
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-muted-foreground"
                >
                  Você desbloqueou uma nova conquista!
                </motion.p>

                <motion.p
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="text-sm text-muted-foreground"
                >
                  {description}
                </motion.p>

                {/* Button */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  <Button onClick={onClose} size="lg" className="mt-4">
                    Continuar
                  </Button>
                </motion.div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};
