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
  const currentRequestIdRef = useRef<string | null>(null);

  // Update the current request ID without triggering cleanup
  useEffect(() => {
    currentRequestIdRef.current = requestId;
    if (!requestId || !enabled) {
      hasCleanedUpRef.current = false;
    }
  }, [requestId, enabled]);

  // Only setup cleanup on mount, not when requestId changes
  useEffect(() => {
    const performCleanup = async () => {
      const currentId = currentRequestIdRef.current;
      if (!currentId || hasCleanedUpRef.current || !enabled) return;
      
      try {
        hasCleanedUpRef.current = true;
        console.log(`Performing SOS cleanup for request: ${currentId}`);
        await cancelRequest(currentId);
      } catch (error) {
        console.error('Error during SOS cleanup:', error);
        hasCleanedUpRef.current = false; // Reset on error to allow retry
      }
    };

    // Only cleanup on component unmount
    return () => {
      performCleanup();
    };
  }, [cancelRequest, enabled]); // Remove requestId dependency

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