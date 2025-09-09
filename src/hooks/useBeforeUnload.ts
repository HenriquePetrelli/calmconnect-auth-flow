import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useBeforeUnload = (requestId: string | null, patientId: string) => {
  useEffect(() => {
    if (!requestId) return;

    const handleBeforeUnload = async () => {
      try {
        // Get current session for authorization
        const { data: session } = await supabase.auth.getSession();
        const token = session.session?.access_token;

        // Try to delete the emergency request before unload
        const response = await fetch(
          `https://ihrrgmmsfuvlasmzdmwf.supabase.co/functions/v1/emergency-cleanup`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': token ? `Bearer ${token}` : '',
              'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlocnJnbW1zZnV2bGFzbXpkbXdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1NDMzMDcsImV4cCI6MjA2OTExOTMwN30.6hRDCL5alu-Bs4kT4jKYJW3G3zmeBJDZB5udruQzOFU'
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
          // Get session for sendBeacon fallback
          const { data: session } = await supabase.auth.getSession();
          const token = session.session?.access_token;
          
          const data = JSON.stringify({
            request_id: requestId,
            patient_id: patientId,
            authorization: token
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