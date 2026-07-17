import React, { useState } from 'react';
import { Card } from '@/components/ui/card';

const moods = [
  { emoji: '😢', label: 'Triste', value: 'sad' },
  { emoji: '😟', label: 'Preocupado', value: 'worried' },
  { emoji: '😐', label: 'Neutro', value: 'neutral' },
  { emoji: '🙂', label: 'Bem', value: 'good' },
  { emoji: '😊', label: 'Feliz', value: 'happy' },
  { emoji: '😄', label: 'Ótimo', value: 'great' },
  { emoji: '🤗', label: 'Empolgado', value: 'excited' }
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
              flex-shrink-0 flex flex-col items-center p-3 rounded-xl transition-all duration-200
              ${selectedMood === mood.value 
                ? 'bg-primary text-primary-foreground scale-105 shadow-lg' 
                : 'bg-card hover:bg-accent'
              }
            `}
            title={mood.label}
          >
            <span className="text-2xl mb-1">{mood.emoji}</span>
            <span className="text-xs font-medium text-center whitespace-nowrap">
              {mood.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};