import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAppointmentVideoCall } from '@/hooks/useAppointmentVideoCall';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import VideoCallRoom from '@/components/calls/VideoCallRoom';
import RouteSkeleton from '@/components/skeletons/RouteSkeleton';
import { consultationDurationMinutes } from '@/lib/consultationWindow';
import { getFriendlyErrorMessage } from '@/utils/errorMessage';

interface ConsultationData {
  id: string;
  scheduled_at: string;
  duration: number | null;
  patient_id: string;
  psychologistName: string;
}

/**
 * Sala da consulta agendada. A página carrega a consulta e abre a sala
 * (`get_or_create_appointment_webrtc_session`, a mesma para os dois lados);
 * a chamada em si é a mesma sala do SOS (`VideoCallRoom`).
 */
const ConsultationCall = () => {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const { userType: authUserType } = useAuth();
  const userType: 'patient' | 'psychologist' = authUserType === 'psychologist' ? 'psychologist' : 'patient';
  const { endConsultation } = useAppointmentVideoCall();
  const homeRoute = userType === 'psychologist' ? '/psicologo/consultas' : '/appointments';

  const [appointment, setAppointment] = useState<ConsultationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [openingRoom, setOpeningRoom] = useState(false);

  useEffect(() => {
    document.title = 'Consulta | Soliv';
  }, []);

  useEffect(() => {
    if (!appointmentId) {
      navigate(homeRoute);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('id, scheduled_at, duration, patient_id, psychologists!psychologist_id(full_name)')
        .eq('id', appointmentId)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        navigate(homeRoute);
        return;
      }
      const psychologist = data.psychologists as { full_name?: string } | null;
      setAppointment({
        id: data.id,
        scheduled_at: data.scheduled_at,
        duration: data.duration,
        patient_id: data.patient_id,
        psychologistName: psychologist?.full_name ?? 'Psicólogo',
      });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [appointmentId, navigate, homeRoute]);

  // Os dois lados caem na mesma sala da consulta (não uma por aba).
  const openRoom = useCallback(async () => {
    if (!appointmentId) return;
    setOpeningRoom(true);
    setRoomError(null);
    try {
      const { data: roomId, error } = await supabase.rpc('get_or_create_appointment_webrtc_session', {
        p_appointment_id: appointmentId,
      });
      if (error) throw error;
      setSessionId(roomId as string);
    } catch (error) {
      setRoomError(getFriendlyErrorMessage(error, 'Verifique sua conexão e tente entrar de novo.'));
    } finally {
      setOpeningRoom(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    if (appointment) void openRoom();
  }, [appointment, openRoom]);

  const handleLeave = async ({ skipComplete }: { skipComplete?: boolean }) => {
    // Marcada como interrompida ou a sala nem abriu: não há o que concluir.
    if (appointmentId && !skipComplete) {
      try {
        await endConsultation(appointmentId);
      } catch (error) {
        console.error('Error ending consultation:', error);
      }
    }
    navigate(homeRoute);
  };

  if (loading || !appointment) return <RouteSkeleton />;

  if (!sessionId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6" data-testid="consultation-room-error">
        <div className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card p-6 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden="true">
            {roomError ? <AlertTriangle className="h-6 w-6" /> : <Loader2 className="h-6 w-6 animate-spin motion-reduce:animate-none" />}
          </span>
          <div className="space-y-1.5">
            <h2 className="text-lg font-semibold text-foreground">{roomError ? 'Não foi possível abrir a sala' : 'Abrindo a sala...'}</h2>
            {roomError && <p className="text-sm text-muted-foreground">{roomError}</p>}
          </div>
          {roomError && (
            <div className="flex flex-col gap-2">
              <Button className="w-full" onClick={() => void openRoom()} disabled={openingRoom}>
                <RefreshCw className="h-4 w-4" /> Tentar de novo
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate(homeRoute)}>
                Voltar
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <VideoCallRoom
      kind="consultation"
      sessionId={sessionId}
      userType={userType}
      timeLimitSeconds={consultationDurationMinutes(appointment) * 60}
      remoteNameHint={userType === 'patient' ? appointment.psychologistName : null}
      appointment={{ id: appointment.id, scheduledAt: appointment.scheduled_at, patientId: appointment.patient_id }}
      onLeave={handleLeave}
    />
  );
};

export default ConsultationCall;
