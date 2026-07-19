import React, { useState } from 'react';
import { ChevronDown, Smile, Heart, Meh, Frown, CloudRain, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export interface MoodOption {
  value: number;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  colorClass: string;       // text color
  bgClass: string;          // bg tint when selected
  borderClass: string;      // border color when selected
}

export const MOOD_OPTIONS: MoodOption[] = [
  { value: 5, label: 'Muito Bem', Icon: Smile,     colorClass: 'text-green-600',  bgClass: 'bg-green-50 dark:bg-green-950/30',   borderClass: 'border-green-500' },
  { value: 4, label: 'Bem',       Icon: Heart,     colorClass: 'text-blue-600',   bgClass: 'bg-blue-50 dark:bg-blue-950/30',     borderClass: 'border-blue-500' },
  { value: 3, label: 'Neutro',    Icon: Meh,       colorClass: 'text-yellow-600', bgClass: 'bg-yellow-50 dark:bg-yellow-950/30', borderClass: 'border-yellow-500' },
  { value: 2, label: 'Mal',       Icon: Frown,     colorClass: 'text-orange-600', bgClass: 'bg-orange-50 dark:bg-orange-950/30', borderClass: 'border-orange-500' },
  { value: 1, label: 'Muito Mal', Icon: CloudRain, colorClass: 'text-red-600',    bgClass: 'bg-red-50 dark:bg-red-950/30',       borderClass: 'border-red-500' },
];

export const getMoodOptionByValue = (value: number | null) =>
  MOOD_OPTIONS.find((m) => m.value === value) || null;

interface MoodAccordionProps {
  currentValue: number | null;
  onMoodSelected: (value: number) => void;
}

export const MoodAccordion: React.FC<MoodAccordionProps> = ({ currentValue, onMoodSelected }) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isHiding, setIsHiding] = useState(false);

  const selected = getMoodOptionByValue(currentValue);

  const handleSelect = async (mood: MoodOption) => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];
      const { data: patientData } = await supabase
        .from('patients')
        .select('daily_mood_count, daily_mood_sum, last_mood_date, last_mood_value')
        .eq('user_id', user.id)
        .maybeSingle();

      const isNewDay = !patientData?.last_mood_date || patientData.last_mood_date !== today;
      let newCount: number, newSum: number;
      if (isNewDay) {
        newCount = (patientData?.daily_mood_count || 0) + 1;
        newSum = (patientData?.daily_mood_sum || 0) + mood.value;
      } else {
        const previousMoodValue = patientData?.last_mood_value || 0;
        newCount = patientData?.daily_mood_count || 1;
        newSum = (patientData?.daily_mood_sum || 0) - previousMoodValue + mood.value;
      }

      const { error } = await supabase
        .from('patients')
        .update({
          daily_mood_count: newCount,
          daily_mood_sum: newSum,
          last_mood_date: today,
          last_mood_value: mood.value,
        })
        .eq('user_id', user.id);

      if (error) {
        toast({ title: 'Erro', description: 'Não foi possível salvar seu humor.', variant: 'destructive' });
        return;
      }

      onMoodSelected(mood.value);
      setShowFeedback(true);
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro', description: 'Não foi possível salvar seu humor.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleHideMoodDaily = async (e: React.MouseEvent) => {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent('moodToggleChanged', { detail: { enabled: false } }));
    setIsHiding(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase
        .from('patients')
        .update({ daily_mood_enabled: false })
        .eq('user_id', user.id);
      if (error) {
        window.dispatchEvent(new CustomEvent('moodToggleChanged', { detail: { enabled: true } }));
        toast({ title: 'Erro', description: 'Não foi possível ocultar o humor diário.', variant: 'destructive' });
        return;
      }
      toast({ title: 'Humor diário ocultado', description: 'Você pode reativar nas configurações do perfil.' });
    } finally {
      setIsHiding(false);
    }
  };

  const HeaderIcon = selected?.Icon;

  return (
    <div
      className={cn(
        'w-full rounded-2xl border bg-card/80 backdrop-blur-sm shadow-sm transition-all',
        open ? 'border-border' : 'border-border/70'
      )}
    >
      {/* Header (trigger) */}
      <div className="w-full flex items-center justify-between p-3 sm:p-4 gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-3 text-left flex-1 min-w-0"
          aria-expanded={open}
        >
          {selected && HeaderIcon ? (
            <>
              <HeaderIcon className={cn('w-5 h-5 sm:w-6 sm:h-6 shrink-0', selected.colorClass)} />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Humor de hoje</p>
                <p className={cn('text-sm sm:text-base font-semibold truncate', selected.colorClass)}>{selected.label}</p>
              </div>
            </>
          ) : (
            <div className="min-w-0">
              <p className="text-sm sm:text-base font-semibold text-foreground">Registre seu humor</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Como você está se sentindo hoje?</p>
            </div>
          )}
        </button>

        <div className="flex items-center gap-2 shrink-0">
          {open && (
            <button
              type="button"
              onClick={handleHideMoodDaily}
              disabled={isHiding}
              className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground px-2 sm:px-3 py-1 sm:py-1.5 rounded-md border border-border hover:bg-muted transition-colors disabled:opacity-50"
            >
              {isHiding ? 'Ocultando...' : 'Ocultar'}
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Recolher' : 'Expandir'}
            className="p-1 text-muted-foreground hover:text-foreground"
          >
            <ChevronDown className={cn('w-5 h-5 transition-transform', open && 'rotate-180')} />
          </button>
        </div>
      </div>



      {/* Content */}
      {open && (
        <div className="relative px-4 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-2">
            {MOOD_OPTIONS.map((mood) => {
              const Icon = mood.Icon;
              const isSelected = currentValue === mood.value;
              return (
                <button
                  key={mood.value}
                  type="button"
                  onClick={() => handleSelect(mood)}
                  disabled={isSaving}
                  className={cn(
                    'flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed bg-background',
                    isSelected ? `${mood.borderClass} ${mood.bgClass}` : 'border-border hover:border-foreground/20'
                  )}
                >
                  <Icon className={cn('w-7 h-7', isSelected ? mood.colorClass : 'text-muted-foreground')} />
                  <span className={cn('text-sm font-medium', isSelected ? mood.colorClass : 'text-muted-foreground')}>
                    {mood.label}
                  </span>
                </button>
              );
            })}
          </div>

          {showFeedback && selected && (
            <div
              className={cn(
                'mt-3 rounded-lg border px-3 py-2 text-sm inline-flex items-start gap-2 w-full',
                selected.borderClass,
                selected.bgClass,
                selected.colorClass
              )}
            >
              <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Humor registrado! Estamos aqui para apoiar você em cada passo da sua jornada.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MoodAccordion;
