import { useState } from 'react';
import { Loader2, Phone, ShieldCheck, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { SAFETY_PLAN_SECTIONS, telHref, type SafetyPlanListKey } from '@/lib/safetyPlan';

interface SosContact {
  name: string;
  relationship: string | null;
  phone: string;
  is_primary: boolean;
}

type SosPlan = Record<SafetyPlanListKey, string[]> & {
  title: string;
  updated_at: string;
  contacts: SosContact[];
};

interface SosSafetyPlans {
  plans: SosPlan[];
}

/**
 * The patient's safety plans (most recently updated first), for the
 * psychologist during an SOS call. Closed by default and fetched only on
 * demand: every opening is written to security_audit_log by
 * get_sos_safety_plan, so it should be a deliberate act, not something that
 * happens just by opening the context panel.
 */
export const SafetyPlanSection = ({ requestId }: { requestId: string | null }) => {
  const [data, setData] = useState<SosSafetyPlans | null>(null);
  const [state, setState] = useState<'closed' | 'loading' | 'open' | 'error'>('closed');

  const open = async () => {
    if (!requestId) return;
    setState('loading');
    const { data: result, error } = await supabase.rpc('get_sos_safety_plan', { p_request_id: requestId });
    if (error || !result) {
      setState('error');
      return;
    }
    setData(result as unknown as SosSafetyPlans);
    setState('open');
  };

  const plans = data?.plans ?? [];

  return (
    <section className="space-y-2" aria-label="Planos de segurança do paciente">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <ShieldCheck className="h-3 w-3" aria-hidden="true" /> Planos de segurança
      </h3>

      {(state === 'closed' || state === 'error') && (
        <>
          <Button variant="outline" size="sm" className="w-full" onClick={open} disabled={!requestId}>
            Ver plano de segurança e contatos
          </Button>
          <p className="text-xs text-muted-foreground">
            O acesso fica registrado e só vale enquanto este atendimento estiver ativo.
          </p>
          {state === 'error' && (
            <p className="text-xs text-destructive">Não foi possível abrir o plano agora. Tente de novo.</p>
          )}
        </>
      )}

      {state === 'loading' && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Carregando…
        </p>
      )}

      {state === 'open' && plans.length === 0 && (
        <p className="text-xs text-muted-foreground">O paciente ainda não preencheu um plano de segurança.</p>
      )}

      {state === 'open' &&
        plans.map((plan, planIndex) => {
          const sections = SAFETY_PLAN_SECTIONS.filter((s) => (plan[s.key] ?? []).length > 0);
          return (
            <article
              key={`${plan.title}-${planIndex}`}
              className="space-y-3 rounded-lg border border-border/60 p-2.5"
              aria-label={plan.title}
            >
              <h4 className="text-sm font-semibold text-foreground">{plan.title}</h4>

              {plan.contacts.length > 0 ? (
                <ul className="space-y-1.5" aria-label={`Contatos de emergência de ${plan.title}`}>
                  {plan.contacts.map((c) => (
                    <li
                      key={`${c.name}-${c.phone}`}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-2.5 py-2 text-xs"
                    >
                      <span className="min-w-0">
                        <span className="flex items-center gap-1 font-medium text-foreground">
                          {c.is_primary && <Star className="h-3 w-3 text-primary" aria-label="Contato principal" />}
                          {c.name}
                        </span>
                        {c.relationship && <span className="text-muted-foreground">{c.relationship}</span>}
                      </span>
                      <a
                        href={telHref(c.phone)}
                        className="inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 font-medium text-primary"
                      >
                        <Phone className="h-3 w-3" aria-hidden="true" /> {c.phone}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">Nenhum contato de emergência neste plano.</p>
              )}

              {sections.map((s) => (
                <div key={s.key} className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground">{s.shortLabel}</p>
                  <ul className="list-disc space-y-0.5 pl-4 text-xs text-foreground">
                    {plan[s.key].map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </article>
          );
        })}
    </section>
  );
};

export default SafetyPlanSection;
