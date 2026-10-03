import { useMemo, useState } from 'react';
import { Phone, ShieldCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useSafetyPlan, useSafetyPlans } from '@/hooks/useSafetyPlan';
import { SAFETY_PLAN_SECTIONS, type SafetyPlanListKey } from '@/lib/safetyPlan';
import { cn } from '@/lib/utils';

/** Na crise, o que mais ajuda primeiro: motivos, o que fazer sozinho, distrações. */
const CRISIS_ORDER: SafetyPlanListKey[] = ['reasons_to_live', 'coping_strategies', 'distractions', 'safe_environment'];

const PlanContent = ({ planId }: { planId: string }) => {
  const { initial, loading } = useSafetyPlan(planId);

  if (loading) return <div className="h-40 animate-pulse rounded-xl bg-muted" aria-label="Carregando plano" />;

  const sections = CRISIS_ORDER.map((key) => ({
    key,
    title: SAFETY_PLAN_SECTIONS.find((s) => s.key === key)?.title ?? key,
    items: initial.lists[key] ?? [],
  })).filter((s) => s.items.length > 0);

  return (
    <div className="space-y-4">
      {initial.contacts.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Pessoas para quem ligar</h3>
          <ul className="space-y-2">
            {initial.contacts.map((contact) => (
              <li key={`${contact.name}-${contact.phone}`}>
                <Button asChild variant={contact.is_primary ? 'default' : 'outline'} className="h-auto min-h-12 w-full justify-start gap-3 py-2">
                  <a href={`tel:${contact.phone.replace(/[^\d+]/g, '')}`}>
                    <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="min-w-0 text-left">
                      <span className="block break-words font-medium">{contact.name}</span>
                      <span className="block break-words text-xs opacity-80">
                        {[contact.relationship, contact.phone].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                  </a>
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {sections.map((section) => (
        <section key={section.key} className="space-y-1.5">
          <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
            {section.items.map((item) => (
              <li key={item} className="break-words">
                {item}
              </li>
            ))}
          </ul>
        </section>
      ))}

      {sections.length === 0 && initial.contacts.length === 0 && (
        <p className="text-sm text-muted-foreground">Este plano ainda está vazio.</p>
      )}
    </div>
  );
};

const PlanPicker = () => {
  const { plans, loading } = useSafetyPlans();
  // O mais recente primeiro: costuma ser o que a pessoa mais usa.
  const ordered = useMemo(() => [...plans].sort((a, b) => b.updated_at.localeCompare(a.updated_at)), [plans]);
  const [selected, setSelected] = useState<string | null>(null);
  const planId = selected ?? ordered[0]?.id ?? null;

  if (loading) return <div className="h-40 animate-pulse rounded-xl bg-muted" aria-label="Carregando plano" />;

  if (!planId) {
    return (
      <p className="text-sm text-muted-foreground">
        Você ainda não tem um plano de segurança. Depois deste atendimento, vale montar um no card "Plano de
        Segurança" da tela inicial, com o psicólogo se quiser: ele ajuda muito nos próximos momentos difíceis.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {ordered.length > 1 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Escolher plano">
          {ordered.map((plan) => (
            <button
              key={plan.id}
              type="button"
              aria-pressed={plan.id === planId}
              onClick={() => setSelected(plan.id)}
              className={cn(
                'min-h-9 rounded-full border px-3 text-sm',
                plan.id === planId ? 'border-primary bg-primary/10 font-medium text-primary' : 'border-border text-foreground',
              )}
            >
              {plan.title || 'Meu plano'}
            </button>
          ))}
        </div>
      )}
      <PlanContent planId={planId} />
    </div>
  );
};

/**
 * Plano de segurança dentro da tela de SOS (sem sair dela: sair cancela o
 * pedido). Apps de crise como Stay Alive, MY3 e o SOS do Wysa colocam o plano
 * e os contatos de confiança a um toque durante a crise.
 */
const SosSafetyPlanDialog = ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center justify-center gap-2 text-center">
          <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
          Meu plano de segurança
        </DialogTitle>
        <DialogDescription className="text-center">
          Seu pedido continua na fila enquanto você olha o seu plano.
        </DialogDescription>
      </DialogHeader>
      {open && <PlanPicker />}
    </DialogContent>
  </Dialog>
);

export default SosSafetyPlanDialog;
