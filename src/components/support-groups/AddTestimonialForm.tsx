import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { useGroupTestimonials, useGroupSymptoms } from '@/hooks/useSupportGroups';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { usePatientStatistics } from '@/hooks/usePatientStatistics';
import { Loader2 } from 'lucide-react';
import { JOURNAL_MOODS } from '@/components/journal/journalMoods';
import { cn } from '@/lib/utils';

interface AddTestimonialFormProps {
  groupId: string;
  groupName: string;
  onSuccess: () => void;
}

const AddTestimonialForm = ({ groupId, groupName, onSuccess }: AddTestimonialFormProps) => {
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [selectedSymptom, setSelectedSymptom] = useState<string>('');
  const [mood, setMood] = useState<number>(2);
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { addTestimonial } = useGroupTestimonials(groupId);
  const { symptoms, symptomId } = useGroupSymptoms(groupName);
  const { subscribed, subscriptionTier } = useSubscription();
  const { addActivity } = usePatientStatistics();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!text.trim()) {
      return;
    }

    // Check subscription (additional frontend check)
    if (!subscribed || (subscriptionTier !== 'Plus' && subscriptionTier !== 'Premium')) {
      return; // This should not happen as the modal should be blocked already
    }

    setIsSubmitting(true);

    const success = await addTestimonial({
      anonimo: isAnonymous,
      sintoma_id: selectedSymptom === 'none' ? null : symptomId,
      humor: mood,
      texto: text.trim()
    });

    if (success) {
      addActivity(`Grupo de Apoio: ${groupName}`);
      onSuccess();
    }

    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Anonymous Toggle */}
      <div className="flex items-center space-x-2">
        <Switch
          id="anonymous"
          checked={isAnonymous}
          onCheckedChange={setIsAnonymous}
        />
        <Label htmlFor="anonymous">Publicar como Anônimo</Label>
      </div>

      {/* Symptom Selection */}
      {symptoms.length > 0 && (
        <div className="space-y-2">
          <Label>Sintoma relacionado (opcional)</Label>
          <Select value={selectedSymptom} onValueChange={setSelectedSymptom}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um sintoma..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum sintoma específico</SelectItem>
              {symptoms.map((symptom, index) => (
                <SelectItem key={index} value={`${symptomId}-${index}`}>
                  {symptom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Mood Selection */}
      <div className="space-y-3">
        <Label>Como você está se sentindo?</Label>
        <div className="grid grid-cols-3 gap-2">
          {JOURNAL_MOODS.map((m) => {
            const Icon = m.Icon;
            const isSelected = mood === m.value;
            return (
              <Card
                key={m.value}
                className={cn(
                  'cursor-pointer transition-all duration-200 hover:shadow-md',
                  isSelected ? `ring-2 ${m.borderClass} ${m.bgClass}` : 'hover:bg-accent'
                )}
                onClick={() => setMood(m.value)}
              >
                <CardContent className="p-3 text-center flex flex-col items-center gap-1">
                  <Icon className={cn('w-6 h-6', isSelected ? m.colorClass : 'text-muted-foreground')} />
                  <div className={cn('text-xs', isSelected ? m.colorClass : 'text-muted-foreground')}>
                    {m.label}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Text Area */}
      <div className="space-y-2">
        <Label htmlFor="testimonial">Seu depoimento *</Label>
        <Textarea
          id="testimonial"
          placeholder="Compartilhe sua experiência, sentimentos ou qualquer coisa que possa ajudar outras pessoas..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          required
        />
        <div className="text-xs text-muted-foreground">
          {text.length}/500 caracteres
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end gap-3">
        <Button
          type="submit"
          disabled={!text.trim() || text.length > 500 || isSubmitting}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            'Salvar Depoimento'
          )}
        </Button>
      </div>
    </form>
  );
};

export default AddTestimonialForm;