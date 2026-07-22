import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, User, Star, Video } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatBrazilTime, formatTimeOnly } from '@/utils/timezone';
import { useAppointmentVideoCall } from '@/hooks/useAppointmentVideoCall';
import { Appointment } from '@/hooks/useAppointments';

interface AppointmentsListProps {
  appointments: Appointment[];
  showStatus?: boolean;
  showRating?: boolean;
  emptyMessage?: string;
  onViewDetails?: (appointment: Appointment) => void;
  onRate?: (appointmentId: string, rating: number) => void;
}

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'scheduled':
        return 'bg-success/15 text-success border-success/20';
      case 'pending':
        return 'bg-warning/15 text-warning border-warning/20';
      case 'completed':
        return 'bg-secondary/15 text-secondary border-secondary/20';
      case 'cancelled':
        return 'bg-destructive/15 text-destructive border-destructive/20';
      case 'declined':
        return 'bg-destructive/15 text-destructive border-destructive/20';
      case 'reschedule_proposed':
        return 'bg-secondary/15 text-secondary-active border-secondary/20';
      case 'in_progress':
        return 'bg-primary/15 text-primary-active border-primary/20';
      default:
        return 'bg-muted text-foreground border-border';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmado';
      case 'scheduled':
        return 'Confirmado';
      case 'pending':
        return 'Aguardando confirmação';
      case 'completed':
        return 'Concluído';
      case 'cancelled':
        return 'Cancelado';
      case 'declined':
        return 'Recusado';
      case 'reschedule_proposed':
        return 'Reagendamento proposto';
      case 'in_progress':
        return 'Em andamento';
      default:
        return status;
    }
  };

  return (
    <Badge 
      variant="outline" 
      className={getStatusStyle(status)}
    >
      {getStatusText(status)}
    </Badge>
  );
};

const StarRating: React.FC<{ 
  value: number; 
  onChange?: (rating: number) => void;
  readonly?: boolean;
}> = ({ value, onChange, readonly = false }) => {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => !readonly && onChange?.(star)}
          disabled={readonly}
          className={`transition-colors ${
            readonly ? 'cursor-default' : 'cursor-pointer hover:text-warning'
          }`}
        >
          <Star
            size={16}
            className={
              star <= value
                ? 'text-warning fill-yellow-400'
                : 'text-muted-foreground'
            }
          />
        </button>
      ))}
    </div>
  );
};

export const AppointmentsList: React.FC<AppointmentsListProps> = ({
  appointments,
  showStatus = false,
  showRating = false,
  emptyMessage = 'Nenhuma consulta encontrada',
  onViewDetails,
  onRate
}) => {
  const navigate = useNavigate();
  const { canJoinCall, startConsultation, loading: videoCallLoading } = useAppointmentVideoCall();

  if (appointments.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-base font-semibold text-foreground mb-2">
            {emptyMessage}
          </h3>
          <p className="text-sm text-muted-foreground">
            Suas consultas aparecerão aqui quando forem agendadas.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {appointments.map((appointment) => (
        <Card key={appointment.id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <User className="text-primary" size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-foreground truncate">
                        {appointment.psychologist?.full_name || 'Psicólogo não identificado'}
                      </h4>
                      <p className="text-sm text-muted-foreground truncate">
                        {appointment.psychologist?.specialty || appointment.psychologist?.specialization || 'Consulta'}
                      </p>
                    </div>
                    {showStatus && (
                      <StatusBadge status={appointment.status} />
                    )}
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

                  {/* Type badge */}
                  <div className="mb-3">
                    <Badge variant="secondary" className="text-xs">
                      {appointment.appointment_type === 'regular' ? 'Online' : 'Emergência'}
                    </Badge>
                  </div>

                  {/* Notes preview */}
                  {appointment.notes && (
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                      {appointment.notes}
                    </p>
                  )}

                  {/* Rating */}
                  {showRating && (
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs text-muted-foreground">Avaliação:</span>
                      <StarRating
                        value={appointment.rating || 0}
                        onChange={(rating) => onRate?.(appointment.id, rating)}
                        readonly={!!appointment.rating}
                      />
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    {/* Video call button for confirmed appointments */}
                    {['scheduled', 'confirmed'].includes(appointment.status) && (
                      <Button
                        variant={canJoinCall(appointment) ? "default" : "outline"}
                        size="sm"
                        disabled={!canJoinCall(appointment) || videoCallLoading}
                        onClick={async () => {
                          if (canJoinCall(appointment)) {
                            try {
                              await startConsultation(appointment.id);
                              navigate(`/consultation-call/${appointment.id}`);
                            } catch (error) {
                              console.error('Failed to start consultation:', error);
                            }
                          }
                        }}
                        className="gap-1"
                      >
                        <Video size={14} />
                        {canJoinCall(appointment) ? 'Entrar na videochamada' : 'Aguardar horário'}
                      </Button>
                    )}
                    
                    {onViewDetails && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onViewDetails(appointment)}
                      >
                        Ver Detalhes
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};