import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useBeforeUnload = (requestId: string | null, patientId: string) => {
  useEffect(() => {
    if (!requestId) return;

    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable cleanup when user closes browser/tab
      try {
        const data = JSON.stringify({
          request_id: requestId,
          patient_id: patientId
        });

        // Try to delete the emergency request before unload
        navigator.sendBeacon(
          `https://ihrrgmmsfuvlasmzdmwf.supabase.co/functions/v1/emergency-cleanup`,
          new Blob([data], { type: 'application/json' })
        );
      } catch (error) {
        console.error('Error cleaning up emergency request:', error);
      }
    };

    // Handle beforeunload event
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Also handle visibility change (tab switching, mobile app backgrounding)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleBeforeUnload();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [requestId, patientId]);
};