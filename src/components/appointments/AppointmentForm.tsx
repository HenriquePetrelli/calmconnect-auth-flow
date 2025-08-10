import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Clock, User, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useAppointments } from '@/hooks/useAppointments';
import { PsychologistData } from './PsychologistList';

interface AppointmentFormProps {
  psychologist: PsychologistData;
  onBack: () => void;
  onSuccess: () => void;
}

export const AppointmentForm: React.FC<AppointmentFormProps> = ({
  psychologist,
  onBack,
  onSuccess
}) => {
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState('50');
  const [appointmentType, setAppointmentType] = useState('online');
  const [notes, setNotes] = useState('');
  
  const { createAppointment, loading } = useAppointments();

  const timeSlots = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'
  ];

  const filterWeekdays = (date: Date) => {
    const day = date.getDay();
    return day !== 0 && day !== 6; // Exclude Sunday (0) and Saturday (6)
  };

  const handleSubmit = async () => {
    if (!date || !time) {
      return;
    }

    try {
      const [hours, minutes] = time.split(':').map(Number);
      const scheduledDateTime = new Date(date);
      scheduledDateTime.setHours(hours, minutes, 0, 0);

      await createAppointment(
        psychologist.user_id,
        scheduledDateTime.toISOString(),
        parseInt(duration),
        appointmentType,
        notes
      );

      onSuccess();
    } catch (error) {
      console.error('Error creating appointment:', error);
    }
  };

  const isFormValid = date && time;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h2 className="text-xl font-semibold">Agendar Consulta</h2>
          <p className="text-muted-foreground">
            com {psychologist.full_name}
          </p>
        </div>
      </div>

      {/* Psychologist Info */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="text-primary" size={20} />
            </div>
            <div>
              <h3 className="font-semibold">{psychologist.full_name}</h3>
              <p className="text-sm text-muted-foreground">
                {psychologist.specialty || psychologist.specialization || 'Psicologia Geral'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detalhes Fixos da Consulta */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Detalhes da Consulta</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Duração</div>
              <div className="flex items-center gap-2 font-medium"><Clock size={18} /> 50 minutos</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Tipo</div>
              <div className="font-medium">Online</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Date Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Selecione a Data</CardTitle>
        </CardHeader>
        <CardContent>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? (
                  format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                ) : (
                  <span>Escolha uma data</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                disabled={(date) => 
                  date < new Date() || !filterWeekdays(date)
                }
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>

      {/* Time Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Horário</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={time} onValueChange={setTime}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um horário" />
            </SelectTrigger>
            <SelectContent>
              {timeSlots.map((slot) => (
                <SelectItem key={slot} value={slot}>
                  {slot}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>


      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Observações (opcional)</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Descreva brevemente o motivo da consulta ou alguma informação importante..."
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Summary & Actions */}
      {isFormValid && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg">Resumo do Agendamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm">
              <span className="font-medium">Data:</span>{' '}
              {format(date!, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </div>
            <div className="text-sm">
              <span className="font-medium">Horário:</span> {time}
            </div>
            <div className="text-sm">
              <span className="font-medium">Duração:</span> {duration} minutos
            </div>
            <div className="text-sm">
              <span className="font-medium">Tipo:</span>{' '}
              {appointmentType === 'online' ? 'Online' : 'Presencial'}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Voltar
        </Button>
        <Button 
          onClick={handleSubmit} 
          disabled={!isFormValid || loading}
          className="flex-1"
        >
          {loading ? 'Agendando...' : 'Confirmar Agendamento'}
        </Button>
      </div>
    </div>
  );
};