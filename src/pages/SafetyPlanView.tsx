import { useNavigate, useParams } from 'react-router-dom';
import { Heart, Pencil, Phone, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import PageHeader from '@/components/PageHeader';
import PatientBottomNav from '@/components/PatientBottomNav';
import HomeCrisisAccess from '@/components/HomeCrisisAccess';
import OfflinePlanNotice from '@/components/safety/OfflinePlanNotice';
import { useSafetyPlan } from '@/hooks/useSafetyPlan';
import { SAFETY_PLAN_SECTIONS, TOTAL_PLAN_PARTS, countFilledSections, telHref } from '@/lib/safetyPlan';

/**
 * Leitura do plano de segurança. Feita para ser usada numa crise: texto
 * grande, uma seção depois da outra, razões para seguir em destaque e os
 * contatos com botão de ligar. Editar fica a um toque, mas fora do caminho.
 */
const SafetyPlanView = () => {
  const navigate = useNavigate();
  const { planId = '' } = useParams();
  const { initial: plan, loading, notFound, offline } = useSafetyPlan(planId);

  const reasons = plan.lists.reasons_to_live;
  const steps = SAFETY_PLAN_SECTIONS.filter((s) => s.key !== 'reasons_to_live' && plan.lists[s.key].length > 0);
  const filled = countFilledSections(plan.lists, plan.contacts.length);
  const contacts = [...plan.contacts].sort((a, b) => Number(b.is_primary) - Number(a.is_primary));
  const editPath = `/safety-plan/${planId}`;

  return (
    <div className="has-tabs">
      <div className="screen">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
          <PageHeader
            title={loading ? 'Plano de segurança' : plan.title || 'Plano de segurança'}
            backTo="/safety-plan"
            rightAction={
              !loading && !notFound ? (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Editar plano"
                  className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                  onClick={() => navigate(editPath)}
                >
                  <Pencil className="h-5 w-5" />
                </Button>
              ) : undefined
            }
          />
        </div>

        <main className="w-full min-w-0 p-4 space-y-5 max-w-2xl mx-auto">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full rounded-2xl" />
              <Skeleton className="h-40 w-full rounded-2xl" />
            </div>
          ) : notFound ? (
            <div className="space-y-3">
              <p className="text-foreground">Este plano não existe mais. Ele pode ter sido excluído.</p>
              <Button onClick={() => navigate('/safety-plan')}>Ver meus planos</Button>
            </div>
          ) : (
            <>
              {offline && <OfflinePlanNotice />}
              {reasons.length > 0 && (
                <section className="rounded-2xl bg-primary/10 p-5" aria-labelledby="reasons">
                  <h2 id="reasons" className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
                    <Heart className="h-4 w-4" aria-hidden="true" />
                    Minhas razões para seguir
                  </h2>
                  <ul className="mt-3 space-y-1.5">
                    {reasons.map((item) => (
                      <li key={item} className="text-lg font-medium leading-snug text-foreground">
                        {item}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {steps.map((section, index) => (
                <section key={section.key} className="rounded-2xl border border-border bg-card p-5" aria-labelledby={`step-${section.key}`}>
                  <h2 id={`step-${section.key}`} className="flex items-center gap-3 text-base font-semibold text-foreground">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-sm" aria-hidden="true">
                      {index + 1}
                    </span>
                    {section.title}
                  </h2>
                  <ul className="mt-3 space-y-2 pl-10">
                    {plan.lists[section.key].map((item) => (
                      <li key={item} className="list-disc text-base leading-snug text-foreground">
                        {item}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}

              <section className="rounded-2xl border border-border bg-card p-5" aria-labelledby="contacts">
                <h2 id="contacts" className="text-base font-semibold text-foreground">
                  Quem eu posso chamar
                </h2>
                {contacts.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">Nenhum contato de emergência neste plano.</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {contacts.map((contact) => (
                      <li key={`${contact.name}-${contact.phone}`} className="flex items-center gap-3 rounded-xl border border-border p-3">
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-1.5 font-medium text-foreground">
                            {contact.is_primary && <Star className="h-4 w-4 shrink-0 fill-primary text-primary" aria-label="Contato principal" />}
                            <span className="min-w-0 truncate">{contact.name}</span>
                          </p>
                          <p className="truncate text-sm text-muted-foreground">
                            {[contact.relationship, contact.phone].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                        <Button asChild className="min-h-11 shrink-0">
                          <a href={telHref(contact.phone)} aria-label={`Ligar para ${contact.name}`}>
                            <Phone className="mr-1.5 h-4 w-4" aria-hidden="true" />
                            Ligar
                          </a>
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <HomeCrisisAccess />

              {filled < TOTAL_PLAN_PARTS && (
                <p className="text-center text-sm text-muted-foreground">
                  {filled} de {TOTAL_PLAN_PARTS} partes preenchidas.{' '}
                  <button type="button" className="font-medium text-primary underline underline-offset-2" onClick={() => navigate(editPath)}>
                    Completar o plano
                  </button>
                </p>
              )}

              <Button variant="outline" className="w-full min-h-11" onClick={() => navigate(editPath)}>
                <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                Editar plano
              </Button>
            </>
          )}
        </main>
      </div>
      <PatientBottomNav />
    </div>
  );
};

export default SafetyPlanView;
