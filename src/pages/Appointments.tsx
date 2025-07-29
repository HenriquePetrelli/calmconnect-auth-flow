import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Calendar, Plus, Clock, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppointmentScheduleModal } from '@/components/appointments/AppointmentScheduleModal';
import { AppointmentHistory } from '@/components/appointments/AppointmentHistory';
import { useAppointments } from '@/hooks/useAppointments';

const Appointments = () => {
  const navigate = useNavigate();
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const { appointments, loading } = useAppointments();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'text-green-600 bg-green-100';
      case 'scheduled':
        return 'text-blue-600 bg-blue-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-border">
        <Button variant="ghost" size="sm" onClick={() => navigate('/home')}>
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-xl font-semibold text-foreground">Consultas</h1>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Schedule New Appointment */}
        <Card>
          <CardContent className="p-6">
            <Button 
              className="w-full flex items-center gap-2" 
              size="lg"
              onClick={() => setShowScheduleModal(true)}
            >
              <Plus size={20} />
              Agendar Nova Consulta
            </Button>
          </CardContent>
        </Card>

        {/* Upcoming Appointments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="text-primary" size={20} />
              Próximas Consultas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="space-y-4">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="p-4 rounded-lg border animate-pulse">
                    <div className="h-4 bg-muted rounded mb-2" />
                    <div className="h-3 bg-muted rounded w-2/3" />
                  </div>
                ))}
              </div>
            ) : appointments.length > 0 ? (
              appointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="p-4 rounded-lg border border-border bg-card"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <User className="text-primary" size={20} />
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">
                          {appointment.psychologist.full_name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {appointment.psychologist.specialty || 'Consulta'}
                        </div>
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                      {appointment.status === 'confirmed' ? 'Confirmado' : 
                       appointment.status === 'scheduled' ? 'Agendado' : 'Pendente'}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar size={14} />
                      {new Date(appointment.scheduled_at).toLocaleDateString('pt-BR')}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock size={14} />
                      {new Date(appointment.scheduled_at).toLocaleTimeString('pt-BR', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar size={32} className="mx-auto mb-2 opacity-50" />
                <p>Nenhuma consulta agendada</p>
                <p className="text-sm">Agende sua primeira consulta acima</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Consultation History */}
        <AppointmentHistory />
      </div>

      {/* Schedule Modal */}
      <AppointmentScheduleModal
        open={showScheduleModal}
        onOpenChange={setShowScheduleModal}
      />
    </div>
  );
};

export default Appointments;