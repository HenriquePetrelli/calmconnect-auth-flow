import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { format, setHours, setMinutes } from 'date-fns';
import { fromZonedTime } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAvailableTimeSlots } from '@/hooks/useAvailableTimeSlots';

interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (scheduledAt: string, notes: string) => Promise<boolean>;
  loading?: boolean;
  originalDate: string;
}

export const RescheduleModal: React.FC<RescheduleModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
  originalDate
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [psychologistId, setPsychologistId] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    supabase.auth.getUser().then(({ data }) => setPsychologistId(data.user?.id ?? ''));
  }, [isOpen]);

  // Only offer times that fall inside the psychologist's own configured
  // schedule (base blocks + date exceptions + vacations) — proposing a
  // time outside it would be a reschedule nobody, not even the
  // psychologist themselves, could actually honor.
  const { availableSlots, isDayAvailable, loading: slotsLoading } = useAvailableTimeSlots({
    psychologistId,
    selectedDate,
  });

  useEffect(() => {
    setSelectedTime('');
  }, [selectedDate]);

  const originalAppointmentDate = originalDate ? new Date(originalDate) : null;
  const isValidOriginal = originalAppointmentDate && !isNaN(originalAppointmentDate.getTime());
  const minDate = isValidOriginal ? originalAppointmentDate! : new Date();
  const maxDate = new Date(minDate);
  maxDate.setDate(maxDate.getDate() + 7);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime) return;

    const [hours, minutes] = selectedTime.split(':').map(Number);
    const scheduledAt = setMinutes(setHours(selectedDate, hours), minutes);
    const scheduledAtUTC = fromZonedTime(scheduledAt, 'America/Sao_Paulo');

    const success = await onConfirm(scheduledAtUTC.toISOString(), notes);
    if (success) {
      setSelectedDate(undefined);
      setSelectedTime('');
      setNotes('');
    }
    // On failure, keep the picked date/time/notes so the psychologist
    // doesn't have to redo them after seeing the error toast.
  };

  const handleClose = () => {
    setSelectedDate(undefined);
    setSelectedTime('');
    setNotes('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            Propor Novo Horário
          </DialogTitle>
          <DialogDescription>
            Sugira uma nova data e horário para o paciente
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Data
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !selectedDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate
                    ? format(selectedDate, "PPP", { locale: ptBR })
                    : 'Selecione uma data'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date < minDate || date > maxDate || !isDayAvailable(date)}
                  initialFocus
                  locale={ptBR}
                  className={cn('p-3 pointer-events-auto')}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Horário
            </Label>
            <Select value={selectedTime} onValueChange={setSelectedTime} disabled={!selectedDate || slotsLoading}>
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !selectedDate
                      ? 'Selecione uma data primeiro'
                      : slotsLoading
                        ? 'Carregando horários...'
                        : availableSlots.length === 0
                          ? 'Nenhum horário disponível nessa data'
                          : 'Selecione um horário'
                  }
                />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {availableSlots.map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Explique o motivo do reagendamento..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !selectedDate || !selectedTime}
              className="flex-1"
            >
              {loading ? 'Enviando...' : 'Propor Horário'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
