import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, User, Calendar, MessageSquare } from 'lucide-react';
import { usePsychologistSchedule } from '@/hooks/usePsychologistSchedule';
import { format, isToday, isTomorrow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatBrazilTime, formatTimeOnly } from '@/utils/timezone';
import { Badge as BadgeUI } from '@/components/ui/badge';
import PendingAppointments from './PendingAppointments';

const formatTimeUntil = (minutes: number): string => {
  const total = Math.max(0, Math.floor(minutes));
  const days = Math.floor(total / (60 * 24));
  const hours = Math.floor((total % (60 * 24)) / 60);
  const mins = total % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0 || parts.length === 0) parts.push(`${mins}min`);
  return parts.join(' ');
};

const UpcomingConsultations = () => {
  const { 
    todayAppointments: todayRaw, 
    upcomingAppointments: upcomingRaw, 
    loading, 
    canStartAppointment,
    updateAppointment 
  } = usePsychologistSchedule();

  const acceptedStatuses = ['scheduled', 'confirmed', 'in_progress'];
  const todayAppointments = todayRaw.filter((a: any) => acceptedStatuses.includes(a.status));
  const todayIds = new Set(todayAppointments.map((a: any) => a.id));
  const isSameLocalDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
  const now = new Date();
  const upcomingAppointments = upcomingRaw.filter((a: any) => {
    if (todayIds.has(a.id)) return false;
    return !isSameLocalDay(new Date(a.scheduled_at), now);
  });
  
  const [startingAppointments, setStartingAppointments] = useState<Set<string>>(new Set());

  const handleStartConsultation = async (appointmentId: string) => {
    setStartingAppointments(prev => new Set(prev).add(appointmentId));
    try {
      await updateAppointment(appointmentId, { status: 'in_progress' });
      // TODO: Integrate with video call system
      // Starting consultation (removed sensitive logging)
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
    const minutesUntilAppointment = (appointmentDate.getTime() - now.getTime()) / (1000 * 60);

    if (minutesUntilAppointment <= 15 && minutesUntilAppointment > 0) {
      return { badge: 'Disponível agora', style: 'bg-success/15 text-success border-success/20' };
    }
    if (minutesUntilAppointment <= 0 && minutesUntilAppointment > -60) {
      return { badge: 'Em andamento', style: 'bg-primary/15 text-primary-active border-primary/20' };
    }
    if (minutesUntilAppointment > 0) {
      return {
        badge: `Em ${formatTimeUntil(minutesUntilAppointment)}`,
        style: 'bg-secondary/15 text-secondary-active border-secondary/20',
      };
    }
    return { badge: 'Encerrada', style: 'bg-muted text-foreground border-border' };
  };

  const renderAppointmentCard = (appointment: any) => {
    const timeInfo = getAppointmentTimeInfo(appointment.scheduled_at);

    return (
      <Card key={appointment.id}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <User className="text-primary" size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2 gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-foreground truncate">
                    {appointment.patient.full_name}
                  </h4>
                  <p className="text-sm text-muted-foreground truncate">
                    {appointment.appointment_type === 'emergency' ? 'Consulta de emergência' : 'Consulta online'}
                  </p>
                </div>
                <BadgeUI variant="outline" className={timeInfo.style}>
                  {timeInfo.badge}
                </BadgeUI>
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                <div className="flex items-center gap-1">
                  <Calendar size={14} />
                  {formatBrazilTime(appointment.scheduled_at, "dd 'de' MMM")}
                </div>
                <div className="flex items-center gap-1">
                  <Clock size={14} />
                  {formatTimeOnly(appointment.scheduled_at)}
                </div>
                {appointment.duration && (
                  <span className="text-xs bg-muted px-2 py-1 rounded">
                    {appointment.duration}min
                  </span>
                )}
              </div>

              {appointment.notes && (
                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                  {appointment.notes}
                </p>
              )}

              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled className="flex-1">
                  <Clock className="w-4 h-4 mr-2" />
                  Aguardando paciente
                </Button>
                <Button variant="outline" size="sm">
                  <MessageSquare className="w-4 h-4" />
                </Button>
              </div>
            </div>
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
      {/* Pending Appointments */}
      <PendingAppointments />
      
      {/* Today's Appointments */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
          <CardTitle className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
              <Calendar className="text-primary" size={18} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground">Consultas de Hoje</h3>
              <p className="text-sm text-muted-foreground font-normal">Pacientes agendados para hoje</p>
            </div>
            {todayAppointments.length > 0 && (
              <Badge variant="secondary">{todayAppointments.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {todayAppointments.length === 0 ? (
            <div className="p-6 text-center">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Nenhuma consulta hoje
              </h3>
              <p className="text-muted-foreground">
                Você não tem consultas agendadas para hoje.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayAppointments.map((appointment) => renderAppointmentCard(appointment))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Appointments */}
      <Card className="border-l-4 border-l-secondary">
        <CardHeader className="bg-gradient-to-r from-secondary/5 to-transparent">
          <CardTitle className="flex items-center gap-3">
            <div className="w-10 h-10 bg-secondary/20 rounded-full flex items-center justify-center">
              <Clock className="text-secondary" size={18} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground">Próximas Consultas</h3>
              <p className="text-sm text-muted-foreground font-normal">Suas consultas agendadas</p>
            </div>
            {upcomingAppointments.length > 0 && (
              <Badge variant="outline">{upcomingAppointments.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {upcomingAppointments.length === 0 ? (
            <div className="p-6 text-center">
              <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Nenhuma consulta próxima
              </h3>
              <p className="text-muted-foreground">
                Você não tem consultas agendadas para os próximos dias.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingAppointments.map((appointment) => renderAppointmentCard(appointment))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UpcomingConsultations;