import React, { useState } from 'react';
import { Frown, Annoyed, Meh, Smile, SmilePlus, Laugh, PartyPopper } from 'lucide-react';

const moods = [
  { Icon: Frown, label: 'Triste', value: 'sad' },
  { Icon: Annoyed, label: 'Preocupado', value: 'worried' },
  { Icon: Meh, label: 'Neutro', value: 'neutral' },
  { Icon: Smile, label: 'Bem', value: 'good' },
  { Icon: SmilePlus, label: 'Feliz', value: 'happy' },
  { Icon: Laugh, label: 'Ótimo', value: 'great' },
  { Icon: PartyPopper, label: 'Empolgado', value: 'excited' }
];

export const MoodSelector: React.FC = () => {
  const [selectedMood, setSelectedMood] = useState<string | null>(null);

  return (
    <div className="w-full">
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {moods.map((mood) => (
          <button
            key={mood.value}
            onClick={() => setSelectedMood(mood.value)}
            className={`
              flex-shrink-0 flex flex-col items-center p-3 rounded-xl transition-colors duration-200
              ${selectedMood === mood.value 
                ? 'bg-primary text-primary-foreground shadow-lg' 
                : 'bg-card hover:bg-accent'
              }
            `}
            title={mood.label}
          >
            <mood.Icon className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium text-center whitespace-nowrap">
              {mood.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};