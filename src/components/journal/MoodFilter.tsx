import { Button } from '@/components/ui/button';

const moodEmojis = ['😞', '😔', '😐', '🙂', '😊', '😄'];
const moodLabels = ['Muito triste', 'Triste', 'Neutro', 'Bem', 'Feliz', 'Muito feliz'];

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
      
      {moodEmojis.map((emoji, index) => (
        <Button
          key={index}
          variant={selectedMood === index ? "default" : "outline"}
          size="sm"
          onClick={() => onMoodSelect(index)}
          className="flex items-center gap-1 flex-shrink-0"
          title={moodLabels[index]}
        >
          <span>{emoji}</span>
          <span className="text-xs hidden sm:inline">{moodLabels[index]}</span>
        </Button>
      ))}
    </div>
  );
};

export default MoodFilter;