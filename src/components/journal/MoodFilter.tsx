import { Button } from '@/components/ui/button';
import { JOURNAL_MOODS } from './journalMoods';
import { cn } from '@/lib/utils';

interface MoodFilterProps {
  selectedMood: number | null;
  onMoodSelect: (mood: number | null) => void;
}

const MoodFilter = ({ selectedMood, onMoodSelect }: MoodFilterProps) => {
  return (
    <div className="flex flex-wrap gap-2 p-4 bg-card rounded-lg border">
      <Button
        variant={selectedMood === null ? "default" : "outline"}
        size="sm"
        onClick={() => onMoodSelect(null)}
        className="flex-shrink-0"
      >
        Todos
      </Button>

      {JOURNAL_MOODS.map((mood) => {
        const Icon = mood.Icon;
        const isSelected = selectedMood === mood.value;
        return (
          <Button
            key={mood.value}
            variant={isSelected ? "default" : "outline"}
            size="sm"
            onClick={() => onMoodSelect(mood.value)}
            className="flex items-center gap-1 flex-shrink-0"
            title={mood.label}
          >
            <Icon className={cn('w-4 h-4', !isSelected && mood.colorClass)} />
            <span className="text-xs hidden sm:inline">{mood.label}</span>
          </Button>
        );
      })}
    </div>
  );
};

export default MoodFilter;
