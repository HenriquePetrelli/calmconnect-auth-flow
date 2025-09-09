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

    const performCleanup = async () => {
      if (isCleanedUp) return;
      
      try {
        isCleanedUp = true;
        console.log(`Performing SOS cleanup for request: ${requestId}`);
        await cancelRequest(requestId);
      } catch (error) {
        console.error('Error during SOS cleanup:', error);
      }
    };

    // Cleanup when component unmounts (user navigates away)
    const handleUnmount = () => {
      performCleanup();
    };

    // Cleanup when browser/tab is closed
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      performCleanup();
      // Don't show browser confirmation dialog for emergency situations
    };

    // Cleanup when page becomes hidden (mobile apps, tab switching)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        performCleanup();
      }
    };

    // Cleanup when page loses focus
    const handlePageBlur = () => {
      // Small delay to avoid false positives from dropdown menus, etc.
      setTimeout(() => {
        if (!document.hasFocus() && document.visibilityState === 'hidden') {
          performCleanup();
        }
      }, 1000);
    };

    // Register all cleanup listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleUnmount);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handlePageBlur);

    // Cleanup function - this runs when component unmounts
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleUnmount);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handlePageBlur);
      
      // Perform cleanup on unmount if not done yet
      handleUnmount();
    };
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