import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { useAppointments, type Psychologist } from '@/hooks/useAppointments';
import { format, addDays, setHours, setMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface AppointmentScheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const timeSlots = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'
];

export const AppointmentScheduleModal = ({
  open,
  onOpenChange,
}: AppointmentScheduleModalProps) => {
  const { psychologists, createAppointment, loading } = useAppointments();
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>();
  const [selectedPsychologist, setSelectedPsychologist] = useState<string>();
  const [notes, setNotes] = useState('');

  const handleSchedule = async () => {
    if (!selectedDate || !selectedTime || !selectedPsychologist) {
      return;
    }

    try {
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const scheduledAt = setMinutes(setHours(selectedDate, hours), minutes);
      
      await createAppointment(
        selectedPsychologist,
        scheduledAt.toISOString(),
        notes
      );
      
      // Reset form
      setSelectedDate(undefined);
      setSelectedTime(undefined);
      setSelectedPsychologist(undefined);
      setNotes('');
      onOpenChange(false);
    } catch (error) {
      console.error('Error scheduling appointment:', error);
    }
  };

  const isFormValid = selectedDate && selectedTime && selectedPsychologist;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Agendar Nova Consulta</DialogTitle>
          <DialogDescription>
            Escolha um psicólogo, data e horário para sua consulta
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Psychologist Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Selecionar Psicólogo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {psychologists.map((psychologist) => (
                  <div
                    key={psychologist.user_id}
                    className={cn(
                      'p-3 border rounded-lg cursor-pointer transition-colors',
                      selectedPsychologist === psychologist.user_id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    )}
                    onClick={() => setSelectedPsychologist(psychologist.user_id)}
                  >
                    <h4 className="font-medium">{psychologist.full_name}</h4>
                    {psychologist.specialty && (
                      <p className="text-sm text-muted-foreground">
                        {psychologist.specialty}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Date and Time Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Data e Horário</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => 
                  date < new Date() || date < addDays(new Date(), 1)
                }
                className={cn("rounded-md border pointer-events-auto")}
                locale={ptBR}
              />

              {selectedDate && (
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Horário Disponível
                  </label>
                  <Select value={selectedTime} onValueChange={setSelectedTime}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um horário" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Observações (opcional)</label>
          <Textarea
            placeholder="Descreva brevemente o motivo da consulta ou observações importantes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        {/* Summary */}
        {isFormValid && (
          <Card className="bg-primary/5">
            <CardContent className="pt-4">
              <h4 className="font-medium mb-2">Resumo do Agendamento</h4>
              <div className="space-y-1 text-sm">
                <p>
                  <strong>Psicólogo:</strong>{' '}
                  {psychologists.find(p => p.user_id === selectedPsychologist)?.full_name}
                </p>
                <p>
                  <strong>Data:</strong>{' '}
                  {selectedDate && format(selectedDate, 'PPP', { locale: ptBR })}
                </p>
                <p>
                  <strong>Horário:</strong> {selectedTime}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSchedule}
            disabled={!isFormValid || loading}
          >
            {loading ? 'Agendando...' : 'Confirmar Agendamento'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};