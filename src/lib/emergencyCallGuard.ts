import { supabase } from '@/integrations/supabase/client';

export const ONGOING_CALL_STATUSES = ['accepted', 'in_progress'];
export const OPEN_REQUEST_STATUSES = ['pending', 'accepted', 'in_progress'];

export interface ActiveEmergencyRow {
  id: string;
  patient_id: string;
  accepted_by: string | null;
  status: string;
  video_room_id: string | null;
  room_url: string | null;
  started_at: string | null;
}

const SELECT = 'id, patient_id, accepted_by, status, video_room_id, room_url, started_at';

/** Any emergency request the patient still has open (not ended / not cancelled). */
export const findPatientOpenRequest = async (patientId: string) => {
  const { data } = await supabase
    .from('emergency_requests')
    .select(SELECT)
    .eq('patient_id', patientId)
    .in('status', OPEN_REQUEST_STATUSES)
    .is('ended_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as ActiveEmergencyRow | null) ?? null;
};

/** Any emergency call the psychologist is currently attending. */
export const findPsychologistOngoingCall = async (psychologistId: string) => {
  const { data } = await supabase
    .from('emergency_requests')
    .select(SELECT)
    .eq('accepted_by', psychologistId)
    .in('status', ONGOING_CALL_STATUSES)
    .is('ended_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as ActiveEmergencyRow | null) ?? null;
};

/** The ongoing call for a user, in either role. */
export const findOngoingCallForUser = async (userId: string) => {
  const { data } = await supabase
    .from('emergency_requests')
    .select(SELECT)
    .in('status', ONGOING_CALL_STATUSES)
    .is('ended_at', null)
    .or(`patient_id.eq.${userId},accepted_by.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as ActiveEmergencyRow | null) ?? null;
};

export const sessionIdOf = (row: ActiveEmergencyRow | null) =>
  row ? row.video_room_id || row.room_url || null : null;
