import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Calendar } from 'lucide-react';
import { AppointmentsList } from './AppointmentsList';
import { useAppointments, Appointment } from '@/hooks/useAppointments';

export const UpcomingAppointments: React.FC = () => {
  const { appointments, loading } = useAppointments();
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    // Filter for upcoming appointments
    const now = new Date();
    const upcoming = appointments.filter(appointment => {
      const appointmentDate = new Date(appointment.scheduled_at);
      return appointmentDate >= now && 
             ['confirmed', 'pending', 'scheduled'].includes(appointment.status);
    });
    
    // Sort by date (earliest first)
    upcoming.sort((a, b) => 
      new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
    );
    
    setUpcomingAppointments(upcoming);
  }, [appointments]);

  const handleViewDetails = (appointment: Appointment) => {
    // TODO: Implement appointment details modal
    console.log('View details for appointment:', appointment);
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="text-primary" size={20} />
          Próximas Consultas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <AppointmentsList
          appointments={upcomingAppointments}
          showStatus={true}
          emptyMessage="Nenhuma consulta agendada"
          onViewDetails={handleViewDetails}
        />
      </CardContent>
    </Card>
  );
};