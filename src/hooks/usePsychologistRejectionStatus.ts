import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RejectionStatus {
  isRejected: boolean;
  rejectedAt: string | null;
  rejectionReason: string | null;
  shouldShowRejectionMessage: boolean;
  shouldCleanup: boolean;
}

export const usePsychologistRejectionStatus = (userId: string | null) => {
  const [rejectionStatus, setRejectionStatus] = useState<RejectionStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const checkRejectionStatus = async (userIdParam: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_psychologist_rejection_status', {
        p_user_id: userIdParam
      });

      if (error) {
        console.error('Error checking rejection status:', error);
        return null;
      }

      if (data && data.length > 0) {
        const status = data[0];
        return {
          isRejected: status.is_rejected,
          rejectedAt: status.rejected_at,
          rejectionReason: status.rejection_reason,
          shouldShowRejectionMessage: status.should_show_rejection_message,
          shouldCleanup: status.should_cleanup
        };
      }

      return {
        isRejected: false,
        rejectedAt: null,
        rejectionReason: null,
        shouldShowRejectionMessage: false,
        shouldCleanup: false
      };
    } catch (error) {
      console.error('Error checking rejection status:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      checkRejectionStatus(userId).then(setRejectionStatus);
    } else {
      setRejectionStatus(null);
    }
  }, [userId]);

  return { rejectionStatus, loading, checkRejectionStatus };
};