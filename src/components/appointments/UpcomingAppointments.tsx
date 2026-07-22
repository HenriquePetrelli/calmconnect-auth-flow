import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Calendar } from 'lucide-react';
import { AppointmentsList } from './AppointmentsList';
import { AppointmentDetailsModal } from './AppointmentDetailsModal';
import { useAppointments, Appointment } from '@/hooks/useAppointments';

export const UpcomingAppointments: React.FC = () => {
  const { appointments, loading } = useAppointments();
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    // Filter for upcoming appointments (including pending ones and in progress)
    const now = new Date();
    const upcoming = appointments.filter(appointment => {
      const appointmentDate = new Date(appointment.scheduled_at);
      return appointmentDate >= now && 
             ['pending', 'scheduled', 'confirmed', 'reschedule_proposed', 'in_progress'].includes(appointment.status);
    });
    
    // Sort by date (earliest first)
    upcoming.sort((a, b) => 
      new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
    );
    
    setUpcomingAppointments(upcoming);
  }, [appointments]);

  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  const handleViewDetails = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="text-primary" size={20} />
            Próximas Consultas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="p-4 rounded-lg border animate-pulse">
                <div className="h-4 bg-muted rounded mb-2" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-l-4 border-l-primary">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
          <CardTitle className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
              <Calendar className="text-primary" size={18} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">Próximas Consultas</h3>
              <p className="text-sm text-muted-foreground font-normal">Suas consultas agendadas</p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <AppointmentsList
            appointments={upcomingAppointments}
            showStatus={true}
            emptyMessage="Nenhuma consulta agendada"
            onViewDetails={handleViewDetails}
          />
        </CardContent>
      </Card>

      <AppointmentDetailsModal
        appointment={selectedAppointment}
        isOpen={!!selectedAppointment}
        onClose={() => setSelectedAppointment(null)}
        onUpdate={() => {
          // Refresh appointments after updates
          window.location.reload();
        }}
      />
    </>
  );
};