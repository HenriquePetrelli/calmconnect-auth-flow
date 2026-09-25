import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SAFETY_PLAN_INVITE_KEY, isInviteSnoozed } from '@/lib/safetyPlan';

const readDismissedAt = (): string | null => {
  try {
    return localStorage.getItem(SAFETY_PLAN_INVITE_KEY);
  } catch {
    return null;
  }
};

/**
 * Invitation to build a safety plan, on the home screen only. It is never
 * shown on the SOS screen: someone who just pressed the emergency button is
 * in crisis and must not be handed a form. "Agora não" hides it for 14 days.
 */
const SafetyPlanInvite = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user || isInviteSnoozed(readDismissedAt())) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('safety_plans')
        .select('id')
        .eq('patient_id', user.id)
        .maybeSingle();
      if (!cancelled && !error && !data) setVisible(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!visible) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(SAFETY_PLAN_INVITE_KEY, new Date().toISOString());
    } catch {
      // Private mode / blocked storage: just hide it for this visit.
    }
    setVisible(false);
  };

  return (
    <section className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-4" aria-label="Plano de segurança">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">Monte seu plano de segurança</p>
          <p className="text-sm text-muted-foreground">
            Com calma, anote o que ajuda você nos momentos difíceis e quem pode ser chamado. Leva uns 10 minutos.
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" className="min-h-10" onClick={() => navigate('/safety-plan')}>
          Começar
        </Button>
        <Button size="sm" variant="ghost" className="min-h-10" onClick={dismiss}>
          Agora não
        </Button>
      </div>
    </section>
  );
};

export default SafetyPlanInvite;
