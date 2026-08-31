import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Clock, Calendar as CalendarIcon, User, AlertTriangle, CalendarX } from 'lucide-react';
import { format, addDays, setHours, setMinutes, startOfDay } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';
import { useAppointments } from '@/hooks/useAppointments';
import { useToast } from '@/hooks/use-toast';
import { useAvailableTimeSlots } from '@/hooks/useAvailableTimeSlots';
import { formatAppointmentTime } from '@/utils/timezone';
import { EmptyState } from '@/components/EmptyState';
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
    isSlotAvailable,
    hasAnyAvailability,
    isDayAvailable,
  } = useAvailableTimeSlots({
    psychologistId: psychologist.user_id,
    selectedDate
  });

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Por favor, selecione data e horário',
        variant: 'destructive',
      });
      return;
    }

    // Verificar se horário está disponível (dentro da agenda do psicólogo e sem conflito)
    if (!allTimeSlots.includes(selectedTime) || !isSlotAvailable(selectedTime)) {
      toast({
        title: 'Horário indisponível',
        description: 'Este horário não está mais disponível. Escolha outro horário.',
        variant: 'destructive',
      });
      return;
    }

    const [hours, minutes] = selectedTime.split(':').map(Number);
    const appointmentDateTime = setMinutes(setHours(selectedDate, hours), minutes);

    setIsSubmitting(true);

    try {
      // Converter horário de Brasília para UTC
      const appointmentUTC = fromZonedTime(appointmentDateTime, 'America/Sao_Paulo');
      
      await createAppointment(
        psychologist.user_id,
        appointmentUTC.toISOString(),
        50, // duração padrão de 50 minutos
        'regular',
        notes.trim() || undefined
      );

      toast({
        title: 'Solicitação enviada!',
        description: `Sua consulta foi solicitada para ${formatAppointmentTime(appointmentUTC)}. Aguarde a confirmação do psicólogo.`,
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
      <Card className="border-secondary/20 bg-secondary/10/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-secondary">
            <AlertTriangle className="w-5 h-5" />
            Regras de Agendamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-secondary">
          <p>• Horários disponíveis seguem a agenda semanal cadastrada pelo psicólogo</p>
          <p>• Duração da consulta: <strong>50 minutos</strong></p>
          <p>• Cancelamentos podem ser feitos até <strong>12h antes</strong> da consulta</p>
          <p>• O psicólogo tem <strong>24h para confirmar</strong> sua solicitação</p>
        </CardContent>
      </Card>

      {!hasAnyAvailability && !slotsLoading ? (
        <EmptyState
          icon={CalendarX}
          title="Psicólogo sem horários configurados"
          description="Este psicólogo ainda não cadastrou a agenda semanal de atendimento. Tente novamente mais tarde ou escolha outro profissional."
        />
      ) : (
        <>
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
                  return date < startOfDay(now) || date > addDays(new Date(), 30) || !isDayAvailable(date);
                }}
                locale={ptBR}
                className="rounded-md border"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Dias sem atendimento do psicólogo aparecem desabilitados no calendário.
              </p>
            </CardContent>
          </Card>

          {/* Time Selection */}
          {selectedDate && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Horário disponível
                  {slotsLoading && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary ml-2"></div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!slotsLoading && allTimeSlots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    O psicólogo não atende neste dia. Escolha outra data no calendário.
                  </p>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      {allTimeSlots.map((time) => {
                        const isAvailable = isSlotAvailable(time);
                        const isOccupied = occupiedSlots.includes(time);

                        return (
                          <Button
                            key={time}
                            variant={selectedTime === time ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedTime(time)}
                            disabled={!isAvailable || slotsLoading}
                            className={`text-sm relative ${
                              isOccupied
                                ? 'bg-destructive/10 border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive cursor-not-allowed'
                                : selectedTime === time
                                  ? ''
                                  : 'hover:bg-secondary/10 hover:text-secondary hover:border-secondary/40'
                            }`}
                            title={isOccupied ? 'Horário ocupado' : 'Disponível'}
                          >
                            {time}
                            {isOccupied && (
                              <span className="absolute -top-1 -right-1 w-2 h-2 bg-destructive rounded-full"></span>
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
                        <div className="w-3 h-3 bg-red-200 border border-destructive/30 rounded relative">
                          <span className="absolute -top-1 -right-1 w-2 h-2 bg-destructive rounded-full"></span>
                        </div>
                        <span>Ocupado</span>
                      </div>
                    </div>

                    {occupiedSlots.length > 0 && (
                      <div className="mt-3 p-3 bg-amber-50 border border-warning/20 rounded-lg">
                        <p className="text-sm text-warning">
                          <strong>Horários ocupados:</strong> {occupiedSlots.filter((s) => allTimeSlots.includes(s)).sort().join(', ') || '—'}
                        </p>
                        <p className="text-xs text-amber-700 mt-1">
                          * Cada consulta dura 50 minutos, ocupando aproximadamente 5 slots consecutivos
                        </p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </>
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