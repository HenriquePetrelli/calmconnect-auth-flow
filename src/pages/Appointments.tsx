import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppointmentScheduler } from '@/components/appointments/AppointmentScheduler';
import { UpcomingAppointments } from '@/components/appointments/UpcomingAppointments';
import { AppointmentHistory } from '@/components/appointments/AppointmentHistory';

const Appointments = () => {
  const navigate = useNavigate();
  const [showScheduler, setShowScheduler] = useState(false);

  const handleScheduleSuccess = () => {
    setShowScheduler(false);
  };

  if (showScheduler) {
    return (
      <AppointmentScheduler
        onBack={() => setShowScheduler(false)}
        onSuccess={handleScheduleSuccess}
      />
    );
  }

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
              onClick={() => setShowScheduler(true)}
            >
              <Plus size={20} />
              Agendar Nova Consulta
            </Button>
          </CardContent>
        </Card>

        {/* Upcoming Appointments */}
        <UpcomingAppointments />

        {/* Consultation History */}
        <AppointmentHistory />
      </div>
    </div>
  );
};

export default Appointments;