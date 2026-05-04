import { Button } from '@/components/ui/button';
import { JOURNAL_MOODS } from './journalMoods';
import { cn } from '@/lib/utils';

interface MoodFilterProps {
  selectedMood: number | null;
  onMoodSelect: (mood: number | null) => void;
}

const MoodFilter = ({ selectedMood, onMoodSelect }: MoodFilterProps) => {
  const moodButtons = JOURNAL_MOODS.map((mood) => {
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
  });

  return (
    <div className="p-4 bg-card rounded-lg border space-y-2 sm:space-y-0">
      {/* Mobile: "Todos" em sua própria linha */}
      <div className="flex sm:hidden">
        <Button
          variant={selectedMood === null ? "default" : "outline"}
          size="sm"
          onClick={() => onMoodSelect(null)}
          className="w-full"
        >
          Todos
        </Button>
      </div>
      <div className="flex sm:hidden flex-wrap gap-2">
        {moodButtons}
      </div>

      {/* Desktop: tudo numa linha */}
      <div className="hidden sm:flex flex-wrap gap-2">
        <Button
          variant={selectedMood === null ? "default" : "outline"}
          size="sm"
          onClick={() => onMoodSelect(null)}
          className="flex-shrink-0"
        >
          Todos
        </Button>
        {moodButtons}
      </div>
    </div>
  );
};

export default MoodFilter;
