import React, { useState } from 'react';
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

interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (scheduledAt: string, notes: string) => void;
  loading?: boolean;
  originalDate: string;
}

const generateTimeSlots = (): string[] => {
  const slots: string[] = [];
  for (let hour = 7; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 10) {
      slots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
    }
  }
  return slots;
};

const timeSlots = generateTimeSlots();

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

  const originalAppointmentDate = originalDate ? new Date(originalDate) : null;
  const isValidOriginal = originalAppointmentDate && !isNaN(originalAppointmentDate.getTime());
  const minDate = isValidOriginal ? originalAppointmentDate! : new Date();
  const maxDate = new Date(minDate);
  maxDate.setDate(maxDate.getDate() + 7);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime) return;

    const [hours, minutes] = selectedTime.split(':').map(Number);
    const scheduledAt = setMinutes(setHours(selectedDate, hours), minutes);
    const scheduledAtUTC = fromZonedTime(scheduledAt, 'America/Sao_Paulo');

    onConfirm(scheduledAtUTC.toISOString(), notes);
    setSelectedDate(undefined);
    setSelectedTime('');
    setNotes('');
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
                  disabled={(date) => date < minDate || date > maxDate}
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
            <Select value={selectedTime} onValueChange={setSelectedTime}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um horário" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {timeSlots.map((time) => (
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
