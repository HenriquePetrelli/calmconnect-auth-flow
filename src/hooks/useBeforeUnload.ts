import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useBeforeUnload = (requestId: string | null, patientId: string) => {
  useEffect(() => {
    if (!requestId) return;

    const handleBeforeUnload = async () => {
      try {
        // Try to delete the emergency request before unload
        const response = await fetch(
          `https://ihrrgmmsfuvlasmzdmwf.supabase.co/functions/v1/emergency-cleanup`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              request_id: requestId,
              patient_id: patientId
            }),
          }
        );
        
        if (!response.ok) {
          console.error('Emergency cleanup request failed:', response.status);
        }
      } catch (error) {
        // Fallback to sendBeacon if fetch fails
        try {
          const data = JSON.stringify({
            request_id: requestId,
            patient_id: patientId
          });

          navigator.sendBeacon(
            `https://ihrrgmmsfuvlasmzdmwf.supabase.co/functions/v1/emergency-cleanup`,
            new Blob([data], { type: 'application/json' })
          );
        } catch (beaconError) {
          console.error('Error with sendBeacon cleanup:', beaconError);
        }
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