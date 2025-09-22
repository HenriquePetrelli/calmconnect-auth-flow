import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Clock, Calendar as CalendarIcon, User, AlertTriangle } from 'lucide-react';
import { format, addDays, setHours, setMinutes, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAppointments } from '@/hooks/useAppointments';
import { useToast } from '@/hooks/use-toast';
import { useAvailableTimeSlots } from '@/hooks/useAvailableTimeSlots';
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
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { createAppointment } = useAppointments();
  const { toast } = useToast();
  
  // Hook para gerenciar horários disponíveis
  const { 
    allTimeSlots, 
    occupiedSlots, 
    loading: slotsLoading, 
    isSlotAvailable 
  } = useAvailableTimeSlots({
    psychologistId: psychologist.user_id,
    selectedDate
  });

  // Verificar se pode agendar (qualquer horário permitido)
  const canScheduleDate = (date: Date): boolean => {
    return true; // Permite agendamento imediato
  };

  // Verificar se horário está no intervalo permitido (7h às 18h)
  const isValidTimeSlot = (time: string): boolean => {
    const [hour, minute] = time.split(':').map(Number);
    return (hour >= 7 && hour < 18) || (hour === 18 && minute === 0);
  };

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Por favor, selecione data e horário',
        variant: 'destructive',
      });
      return;
    }

    // Verificar se horário está disponível
    if (!isSlotAvailable(selectedTime)) {
      toast({
        title: 'Horário ocupado',
        description: 'Este horário já está ocupado. Escolha outro horário disponível.',
        variant: 'destructive',
      });
      return;
    }

    const [hours, minutes] = selectedTime.split(':').map(Number);
    const appointmentDateTime = setMinutes(setHours(selectedDate, hours), minutes);

    // Verificação de horário já removida - permite agendamento imediato

    // Verificar horário permitido
    if (!isValidTimeSlot(selectedTime)) {
      toast({
        title: 'Horário inválido',
        description: 'Consultas só podem ser agendadas entre 07h e 18h',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await createAppointment(
        psychologist.user_id,
        appointmentDateTime.toISOString(),
        50, // duração padrão de 50 minutos
        'regular',
        notes.trim() || undefined
      );

      toast({
        title: 'Solicitação enviada!',
        description: `Sua consulta foi solicitada para ${format(appointmentDateTime, "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}. Aguarde a confirmação do psicólogo.`,
      });

      onSuccess();
    } catch (error) {
      console.error('Erro ao agendar consulta:', error);
      toast({
        title: 'Erro ao agendar',
        description: 'Não foi possível agendar a consulta. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h2 className="text-xl font-semibold text-foreground">Agendar Consulta</h2>
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
              <h3 className="font-semibold text-foreground">{psychologist.full_name}</h3>
              <p className="text-sm text-muted-foreground">
                {psychologist.specialty || psychologist.specialization || 'Psicologia Geral'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appointment Rules Info */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <AlertTriangle className="w-5 h-5" />
            Regras de Agendamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-blue-700">
          <p>• Agendamento <strong>imediato</strong> - sem necessidade de antecedência</p>
          <p>• Horários disponíveis: <strong>07h às 18h</strong> (intervalos de 30 minutos)</p>
          <p>• Duração da consulta: <strong>50 minutos</strong></p>
          <p>• Cancelamentos podem ser feitos até <strong>12h antes</strong> da consulta</p>
          <p>• O psicólogo tem <strong>24h para confirmar</strong> sua solicitação</p>
        </CardContent>
      </Card>

      {/* Date Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Data da Consulta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            disabled={(date) => {
              const now = new Date();
              return date < startOfDay(now) || date > addDays(new Date(), 30);
            }}
            locale={ptBR}
            className="rounded-md border"
          />
          
          {/* Aviso de antecedência removido - permite agendamento imediato */}
        </CardContent>
      </Card>

      {/* Time Selection */}
      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Horário (07h às 18h - intervalos de 30 min)
              {slotsLoading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary ml-2"></div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {allTimeSlots.map((time) => {
                const isValidTime = isValidTimeSlot(time);
                const isAvailable = isSlotAvailable(time);
                const isOccupied = occupiedSlots.includes(time);
                
                return (
                  <Button
                    key={time}
                    variant={selectedTime === time ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedTime(time)}
                    disabled={!isValidTime || !isAvailable || slotsLoading}
                    className={`text-sm relative ${
                      isOccupied 
                        ? 'bg-red-50 border-red-200 text-red-500 cursor-not-allowed' 
                        : isAvailable 
                          ? 'hover:bg-primary/10' 
                          : ''
                    }`}
                    title={
                      isOccupied 
                        ? 'Horário ocupado' 
                          : !isValidTime 
                            ? 'Horário fora do funcionamento'
                            : 'Disponível'
                    }
                  >
                    {time}
                    {isOccupied && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                    )}
                  </Button>
                );
              })}
            </div>
            
            {/* Legenda */}
            <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-primary rounded"></div>
                <span>Disponível</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-200 border border-red-300 rounded relative">
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                </div>
                <span>Ocupado</span>
              </div>
            </div>
            
            {occupiedSlots.length > 0 && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  <strong>Horários ocupados:</strong> {occupiedSlots.sort().join(', ')}
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  * Cada consulta dura 50 minutos, ocupando aproximadamente 2 slots consecutivos
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Observações (opcional)</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Descreva brevemente o motivo da consulta ou alguma informação importante que o psicólogo deve saber..."
            rows={4}
            className="resize-none"
          />
        </CardContent>
      </Card>

      {/* Summary */}
      {selectedDate && selectedTime && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle>Resumo da Solicitação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm">
              <span className="font-medium">Psicólogo:</span> {psychologist.full_name}
            </div>
            <div className="text-sm">
              <span className="font-medium">Data:</span>{' '}
              {format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </div>
            <div className="text-sm">
              <span className="font-medium">Horário:</span> {selectedTime}
            </div>
            <div className="text-sm">
              <span className="font-medium">Duração:</span> 50 minutos
            </div>
            <div className="text-sm">
              <span className="font-medium">Status inicial:</span>{' '}
              <Badge variant="secondary">Aguardando confirmação do psicólogo</Badge>
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
          disabled={!selectedDate || !selectedTime || isSubmitting}
          className="flex-1"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Enviando...
            </>
          ) : (
            'Enviar Solicitação'
          )}
        </Button>
      </div>
    </div>
  );
};