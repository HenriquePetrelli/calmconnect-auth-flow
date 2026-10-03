import { useLocation } from "react-router-dom";
import { lazy, Suspense } from "react";

// Só baixa o formulário de avaliação quando há uma avaliação pendente (raro):
// antes ele entrava no pacote inicial de todas as telas.
const FeedbackModal = lazy(() =>
  import("@/components/sos/FeedbackModal").then((m) => ({
    default: m.FeedbackModal,
  })),
);
import {
  dismissAppointmentFeedback,
  usePendingCallFeedback,
} from "@/hooks/usePendingCallFeedback";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Blocks the app while the last emergency call has no evaluation.
 * Mounted globally: patient and psychologist can only continue after rating.
 * Também convida o paciente a avaliar a última consulta agendada (sem bloquear).
 */
const PendingFeedbackGate = () => {
  const { userType } = useAuth();
  const location = useLocation();
  const { pending, recheck, clear } = usePendingCallFeedback();

  // Never interfere with an ongoing call screen (nor with the SOS queue).
  const insideCall =
    location.pathname === "/sos" ||
    location.pathname.startsWith("/emergency-call") ||
    location.pathname.startsWith("/emergency/call") ||
    location.pathname.startsWith("/consultation-call");

  if (
    !pending ||
    insideCall ||
    (userType !== "patient" && userType !== "psychologist")
  ) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <FeedbackModal
        isOpen
        required={pending.kind === "emergency"}
        userType={userType}
        sessionId={pending.sessionId}
        partnerName={pending.partnerName}
        onClose={() => {
          // Consulta agendada: pular ou enviar, não pergunta de novo nessa sessão.
          if (pending.kind === "appointment")
            dismissAppointmentFeedback(pending.sessionId);
          clear();
          recheck();
        }}
      />
    </Suspense>
  );
};

export default PendingFeedbackGate;
