import { useEffect } from 'react';
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

  useEffect(() => {
    if (!requestId || !enabled) return;

    let isCleanedUp = false;
    let cleanupPromise: Promise<void> | null = null;

    const performCleanup = async () => {
      if (isCleanedUp || !requestId || cleanupPromise) return;
      
      try {
        isCleanedUp = true;
        console.log(`Performing SOS cleanup for request: ${requestId}`);
        cleanupPromise = cancelRequest(requestId);
        await cleanupPromise;
      } catch (error) {
        console.error('Error during SOS cleanup:', error);
      } finally {
        cleanupPromise = null;
      }
    };

    // Cleanup function for unmount only (avoid multiple listeners)
    const cleanup = () => {
      if (!isCleanedUp) {
        performCleanup();
      }
    };

    // Only register unmount cleanup to avoid conflicts
    return cleanup;
  }, [requestId, enabled, cancelRequest]);

  // Manual cleanup function
  const manualCleanup = async () => {
    if (requestId) {
      try {
        await cancelRequest(requestId);
      } catch (error) {
        console.error('Manual cleanup error:', error);
      }
    }
  };

  return { manualCleanup };
};