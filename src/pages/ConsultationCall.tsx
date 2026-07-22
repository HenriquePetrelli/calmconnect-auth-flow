import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAppointmentVideoCall } from '@/hooks/useAppointmentVideoCall';
import ConsultationVideoCall from '@/components/appointments/ConsultationVideoCall';
import { Appointment } from '@/hooks/useAppointments';
import { SkeletonFullPage } from '@/components/skeletons/Skeletons';

const ConsultationCall = () => {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const { endConsultation } = useAppointmentVideoCall();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAppointment = async () => {
      if (!appointmentId) {
        navigate('/appointments');
        return;
      }

      try {
        const { data, error } = await supabase
          .from('appointments')
          .select(`
            id,
            scheduled_at,
            status,
            appointment_type,
            notes,
            psychologist_id,
            psychologists!psychologist_id(
              full_name,
              specialization
            )
          `)
          .eq('id', appointmentId)
          .single();

        if (error) throw error;

        if (!data) {
          navigate('/appointments');
          return;
        }

        // Transform data to match Appointment interface
        const transformedAppointment: Appointment = {
          id: data.id,
          scheduled_at: data.scheduled_at,
          status: data.status,
          appointment_type: data.appointment_type,
          notes: data.notes,
          psychologist: {
            full_name: data.psychologists?.full_name || 'Psicólogo não identificado',
            specialization: data.psychologists?.specialization,
          }
        };

        setAppointment(transformedAppointment);
      } catch (error) {
        console.error('Error fetching appointment:', error);
        navigate('/appointments');
      } finally {
        setLoading(false);
      }
    };

    fetchAppointment();
  }, [appointmentId, navigate]);

  const handleEndCall = async () => {
    if (appointmentId) {
      try {
        await endConsultation(appointmentId);
      } catch (error) {
        console.error('Error ending consultation:', error);
      }
    }
    navigate('/appointments');
  };

  if (loading) {
    return <SkeletonFullPage />;
  }

  if (!appointment) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Consulta não encontrada</p>
        </div>
      </div>
    );
  }

  return (
    <ConsultationVideoCall
      appointment={appointment}
      onEndCall={handleEndCall}
    />
  );
};

export default ConsultationCall;