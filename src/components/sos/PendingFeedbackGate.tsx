import { useLocation } from 'react-router-dom';
import { FeedbackModal } from '@/components/sos/FeedbackModal';
import { usePendingCallFeedback } from '@/hooks/usePendingCallFeedback';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Blocks the app while the last emergency call has no evaluation.
 * Mounted globally: patient and psychologist can only continue after rating.
 */
const PendingFeedbackGate = () => {
  const { userType } = useAuth();
  const location = useLocation();
  const { pending, recheck, clear } = usePendingCallFeedback();

  // Never interfere with an ongoing call screen.
  const insideCall = location.pathname.startsWith('/emergency-call') ||
    location.pathname.startsWith('/emergency/call') ||
    location.pathname.startsWith('/consultation-call');

  if (!pending || insideCall || (userType !== 'patient' && userType !== 'psychologist')) {
    return null;
  }

  return (
    <FeedbackModal
      isOpen
      required
      userType={userType}
      sessionId={pending.sessionId}
      onClose={() => {
        clear();
        recheck();
      }}
    />
  );
};

export default PendingFeedbackGate;
