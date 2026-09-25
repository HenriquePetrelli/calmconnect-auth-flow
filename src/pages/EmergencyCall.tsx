import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import EmergencyVideoCall, { type EndCallInfo } from "@/components/EmergencyVideoCall";
import { SkeletonFullPage } from "@/components/skeletons/Skeletons";
import { useEmergencySession } from "@/hooks/useEmergencySession";

/**
 * Emergency (SOS) call route.
 *
 * This page is a thin UI shell: the whole request/session lifecycle lives in
 * `useEmergencySession` and the media/WebRTC layer lives in
 * `EmergencyVideoCall` + `useWebRTC`.
 */
/** Fallback when the request's own limit can't be read (20 min, the free tier). */
const DEFAULT_SOS_TIME_LIMIT = 1200;

const EmergencyCall = () => {
  const { requestId: requestIdParam, sessionId: sessionIdParam } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const userType =
    (searchParams.get("userType") as "psychologist" | "patient") || "patient";
  const requestIdFromUrl = requestIdParam || searchParams.get("requestId") || null;

  useEffect(() => {
    document.title = "Chamada de Emergência | Soliv";
  }, []);

  // The session id is the official room identifier — never trust the URL alone.
  useEffect(() => {
    const fromUrl = sessionIdParam || searchParams.get("sessionId") || searchParams.get("session_id");
    if (fromUrl) {
      setSessionId(fromUrl);
      setLoading(false);
      return;
    }

    if (!requestIdFromUrl) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("webrtc_sessions")
        .select("id")
        .eq("emergency_request_id", requestIdFromUrl)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!cancelled) {
        setSessionId(data?.id ?? null);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionIdParam, searchParams, requestIdFromUrl]);

  // Session length comes from the request itself (filled server-side from
  // the patient's plan: Plus 25 min, Premium 50 min). Resolved before the
  // room mounts: the shared timer persists its first value right away, so
  // starting on a placeholder limit would stick for the whole call.
  const [timeLimit, setTimeLimit] = useState<number | null>(null);
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    (async () => {
      let requestId = requestIdFromUrl;
      if (!requestId) {
        const { data } = await supabase
          .from("webrtc_sessions")
          .select("emergency_request_id")
          .eq("id", sessionId)
          .maybeSingle();
        requestId = data?.emergency_request_id ?? null;
      }
      let limit: number | null = null;
      if (requestId) {
        const { data } = await supabase
          .from("emergency_requests")
          .select("time_limit_seconds")
          .eq("id", requestId)
          .maybeSingle();
        limit = data?.time_limit_seconds ?? null;
      }
      if (!cancelled) setTimeLimit(limit ?? DEFAULT_SOS_TIME_LIMIT);
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, requestIdFromUrl]);

  const { endSession } = useEmergencySession({
    sessionId,
    requestIdFromUrl,
    userType,
  });

  if (loading || (sessionId && timeLimit === null)) {
    return <SkeletonFullPage />;
  }

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center space-y-4">
          <p className="text-lg font-medium">Não foi possível abrir a sala de atendimento</p>
          <p className="text-sm text-muted-foreground">
            A sessão desta emergência não está mais disponível.
          </p>
          <Button onClick={() => navigate(userType === "psychologist" ? "/psychologist-dashboard" : "/home")}>
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <EmergencyVideoCall
      sessionId={sessionId}
      userType={userType}
      timeLimit={timeLimit ?? DEFAULT_SOS_TIME_LIMIT}
      onEndCall={(info?: EndCallInfo) => endSession(info)}
    />
  );
};

export default EmergencyCall;
