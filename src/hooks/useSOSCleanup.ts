import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEmergencySOS } from './useEmergencySOS';

interface SOSCleanupOptions {
  requestId: string | null;
  enabled?: boolean;
}

/**
 * Hook específico para limpeza de consultas emergenciais SOS
 * Garante que consultas sejam canceladas quando o usuário sair da página SOS
 */
export const useSOSCleanup = ({ requestId, enabled = true }: SOSCleanupOptions) => {
  const { cancelRequest } = useEmergencySOS();
  const hasCleanedUpRef = useRef(false);

  useEffect(() => {
    if (!requestId || !enabled) {
      hasCleanedUpRef.current = false;
      return;
    }

    const performCleanup = async () => {
      if (hasCleanedUpRef.current) return;
      
      try {
        hasCleanedUpRef.current = true;
        console.log(`Performing SOS cleanup for request: ${requestId}`);
        await cancelRequest(requestId);
      } catch (error) {
        console.error('Error during SOS cleanup:', error);
        hasCleanedUpRef.current = false; // Reset on error to allow retry
      }
    };

    // Only cleanup on component unmount
    return () => {
      performCleanup();
    };
  }, [requestId, enabled, cancelRequest]);

  // Manual cleanup function
  const manualCleanup = async () => {
    if (requestId && !hasCleanedUpRef.current) {
      try {
        hasCleanedUpRef.current = true;
        await cancelRequest(requestId);
      } catch (error) {
        console.error('Manual cleanup error:', error);
        hasCleanedUpRef.current = false; // Reset on error
      }
    }
  };

  return { manualCleanup };
};