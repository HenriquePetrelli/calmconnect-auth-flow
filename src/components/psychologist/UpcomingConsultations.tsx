import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Clock, User, Video, Calendar, Phone, MessageSquare } from 'lucide-react';
import { usePsychologistSchedule } from '@/hooks/usePsychologistSchedule';
import { format, isToday, isTomorrow, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const UpcomingConsultations = () => {
  const { 
    todayAppointments, 
    upcomingAppointments, 
    loading, 
    canStartAppointment,
    updateAppointment 
  } = usePsychologistSchedule();
  
  const [startingAppointments, setStartingAppointments] = useState<Set<string>>(new Set());

  const handleStartConsultation = async (appointmentId: string) => {
    setStartingAppointments(prev => new Set(prev).add(appointmentId));
    try {
      await updateAppointment(appointmentId, { status: 'in_progress' });
      // TODO: Integrate with video call system
      console.log('Starting consultation:', appointmentId);
    } catch (error) {
      console.error('Error starting consultation:', error);
    } finally {
      setStartingAppointments(prev => {
        const newSet = new Set(prev);
        newSet.delete(appointmentId);
        return newSet;
      });
    }
  };

  const getAppointmentTimeInfo = (scheduledAt: string) => {
    const appointmentDate = new Date(scheduledAt);
    const now = new Date();
    const timeDifference = appointmentDate.getTime() - now.getTime();
    const minutesUntilAppointment = timeDifference / (1000 * 60);

    if (isToday(appointmentDate)) {
      if (minutesUntilAppointment <= 15 && minutesUntilAppointment > 0) {
        return {
          badge: 'Disponível agora',
          badgeVariant: 'default' as const,
          canStart: true
        };
      } else if (minutesUntilAppointment <= 0 && minutesUntilAppointment > -60) {
        return {
          badge: 'Em andamento',
          badgeVariant: 'destructive' as const,
          canStart: true
        };
      } else {
        return {
          badge: `Em ${Math.ceil(minutesUntilAppointment)} min`,
          badgeVariant: 'secondary' as const,
          canStart: false
        };
      }
    } else if (isTomorrow(appointmentDate)) {
      return {
        badge: 'Amanhã',
        badgeVariant: 'outline' as const,
        canStart: false
      };
    } else {
      return {
        badge: format(appointmentDate, 'dd/MM', { locale: ptBR }),
        badgeVariant: 'outline' as const,
        canStart: false
      };
    }
  };

  const renderAppointmentCard = (appointment: any, isToday = false) => {
    const timeInfo = getAppointmentTimeInfo(appointment.scheduled_at);
    const appointmentTime = format(new Date(appointment.scheduled_at), 'HH:mm', { locale: ptBR });
    const patientInitials = appointment.patient.full_name
      .split(' ')
      .map((name: string) => name[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();

    return (
      <Card key={appointment.id} className={isToday ? 'border-primary/20 bg-primary/5' : ''}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-primary/10 text-primary font-medium">
                  {patientInitials}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-medium text-foreground">
                  {appointment.patient.full_name}
                </h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  {appointmentTime}
                  {appointment.appointment_type && (
                    <>
                      <span>•</span>
                      <span className="capitalize">{appointment.appointment_type}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <Badge variant={timeInfo.badgeVariant}>
              {timeInfo.badge}
            </Badge>
          </div>

          {appointment.notes && (
            <div className="bg-card/50 rounded-lg p-3 mb-3">
              <p className="text-sm text-foreground">
                <strong>Notas:</strong> {appointment.notes}
              </p>
            </div>
          )}

          <div className="flex gap-2">
            {timeInfo.canStart ? (
              <Button
                onClick={() => handleStartConsultation(appointment.id)}
                disabled={startingAppointments.has(appointment.id)}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                {startingAppointments.has(appointment.id) ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Video className="w-4 h-4 mr-2" />
                )}
                Iniciar Consulta
              </Button>
            ) : (
              <Button variant="outline" disabled className="flex-1">
                <Clock className="w-4 h-4 mr-2" />
                Aguardando horário
              </Button>
            )}
            <Button variant="outline" size="sm">
              <MessageSquare className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-3"></div>
            <span className="text-muted-foreground">Carregando consultas...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Today's Appointments */}
      <div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Consultas de Hoje
              {todayAppointments.length > 0 && (
                <Badge variant="secondary" className="ml-auto">
                  {todayAppointments.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
        </Card>

        {todayAppointments.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                Nenhuma consulta hoje
              </h3>
              <p className="text-muted-foreground">
                Você não tem consultas agendadas para hoje. Aproveite para descansar ou revisar casos.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {todayAppointments.map((appointment) => renderAppointmentCard(appointment, true))}
          </div>
        )}
      </div>

      {/* Upcoming Appointments */}
      <div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Próximas Consultas
              {upcomingAppointments.length > 0 && (
                <Badge variant="outline" className="ml-auto">
                  {upcomingAppointments.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
        </Card>

        {upcomingAppointments.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                Nenhuma consulta próxima
              </h3>
              <p className="text-muted-foreground">
                Você não tem consultas agendadas para os próximos dias.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {upcomingAppointments.map((appointment) => renderAppointmentCard(appointment))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UpcomingConsultations;