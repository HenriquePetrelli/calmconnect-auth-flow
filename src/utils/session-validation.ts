import { supabase } from '@/integrations/supabase/client';

export interface WebRTCSessionData {
  id: string;
  emergency_request_id?: string;
  psychologist_id?: string;
  patient_id?: string;
  status: string;
  expires_at?: string;
}

export class SessionValidationError extends Error {
  public readonly code: string;
  
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
    this.name = 'SessionValidationError';
  }
}

export const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// Retry mechanism with exponential backoff
const withRetry = async <T>(
  operation: () => Promise<T>,
  options: { retries: number; delay: number } = { retries: 3, delay: 1000 }
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= options.retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === options.retries) {
        throw lastError;
      }
      
      // Exponential backoff: 1s, 2s, 4s
      const delay = options.delay * Math.pow(2, attempt - 1);
      console.log(`⏳ Attempt ${attempt} failed, retrying in ${delay}ms...`, error);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
};

export const validateWebRTCSession = async (sessionId: string): Promise<WebRTCSessionData> => {
  // Validate UUID format first
  if (!sessionId || !isValidUUID(sessionId)) {
    throw new SessionValidationError('ID da sessão inválido ou malformado', 'INVALID_SESSION_ID');
  }

  try {
    console.log(`🔍 Starting validation for session: ${sessionId}`);
    
    const session = await withRetry(async () => {
      console.log(`🔍 Validating session attempt: ${sessionId}`);
      
      // Use maybeSingle to handle cases where session doesn't exist
      const { data: session, error } = await supabase
        .from('webrtc_sessions')
        .select(`
          id,
          emergency_request_id,
          psychologist_id,
          patient_id,
          status,
          expires_at
        `)
        .eq('id', sessionId)
        .maybeSingle(); // Returns null instead of throwing error when no rows found

      if (error) {
        console.error('❌ Database error:', error);
        throw new SessionValidationError('Erro ao acessar dados da sessão', 'DATABASE_ERROR');
      }

      // Session not found - throw error to trigger retry
      if (!session) {
        console.warn(`⚠️ Session not found on attempt: ${sessionId}`);
        throw new Error('SESSION_NOT_READY'); // Will trigger retry
      }

      return session;
    }, { retries: 3, delay: 1000 });

    // Check if session is expired
    if (session.expires_at && new Date(session.expires_at) < new Date()) {
      console.warn(`⏰ Session expired: ${sessionId}`);
      throw new SessionValidationError('Esta sessão de videochamada já expirou', 'SESSION_EXPIRED');
    }

    // Validate user access
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new SessionValidationError('Usuário não autenticado', 'NOT_AUTHENTICATED');
    }

    const hasAccess = session.psychologist_id === user.id || session.patient_id === user.id;
    if (!hasAccess) {
      throw new SessionValidationError('Você não tem permissão para acessar esta sessão', 'ACCESS_DENIED');
    }

    console.log('✅ Session validation completed successfully');
    return session;

  } catch (error) {
    if (error instanceof SessionValidationError) {
      throw error;
    }
    
    // If all retries failed because session wasn't found
    if (error.message === 'SESSION_NOT_READY') {
      throw new SessionValidationError('Sessão de videochamada não encontrada', 'SESSION_NOT_FOUND');
    }
    
    console.error('❌ Unexpected error during session validation:', error);
    throw new SessionValidationError('Erro inesperado ao validar sessão', 'VALIDATION_ERROR');
  }
};

export const getUserTypeForSession = (session: WebRTCSessionData, userId: string): 'psychologist' | 'patient' | null => {
  if (session.psychologist_id === userId) return 'psychologist';
  if (session.patient_id === userId) return 'patient';
  return null;
};