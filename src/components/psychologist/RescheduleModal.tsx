import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (scheduledAt: string, notes: string) => void;
  loading?: boolean;
  originalDate: string; // Original appointment date to calculate 7-day range
}

export const RescheduleModal: React.FC<RescheduleModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
  originalDate
}) => {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDate || !selectedTime) {
      return;
    }

    const scheduledAt = `${selectedDate}T${selectedTime}:00.000Z`;
    onConfirm(scheduledAt, notes);
    
    // Reset form
    setSelectedDate('');
    setSelectedTime('');
    setNotes('');
  };

  const handleClose = () => {
    setSelectedDate('');
    setSelectedTime('');
    setNotes('');
    onClose();
  };

  // Generate time options (7:00 to 18:00)
  const timeOptions = [];
  for (let hour = 7; hour <= 18; hour++) {
    timeOptions.push(`${hour.toString().padStart(2, '0')}:00`);
  }

  // Calculate date range: from original date to 7 days later
  const originalAppointmentDate = new Date(originalDate);
  const minDate = format(originalAppointmentDate, 'yyyy-MM-dd');
  
  const maxAppointmentDate = new Date(originalAppointmentDate);
  maxAppointmentDate.setDate(maxAppointmentDate.getDate() + 7);
  const maxDate = format(maxAppointmentDate, 'yyyy-MM-dd');

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Propor Novo Horário
          </DialogTitle>
          <DialogDescription>
            Sugira uma nova data e horário para o paciente
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date Input */}
          <div className="space-y-2">
            <Label htmlFor="date" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Data
            </Label>
            <Input
              id="date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={minDate}
              max={maxDate}
              required
            />
          </div>

          {/* Time Input */}
          <div className="space-y-2">
            <Label htmlFor="time" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Horário
            </Label>
            <select
              id="time"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              required
            >
              <option value="">Selecione um horário</option>
              {timeOptions.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Explique o motivo do reagendamento ou forneça informações adicionais..."
              rows={3}
            />
          </div>

          {/* Actions */}
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