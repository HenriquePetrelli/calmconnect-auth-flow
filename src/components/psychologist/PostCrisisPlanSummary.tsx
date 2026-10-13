import { useCallback, useEffect, useState } from 'react';
import { Pencil, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PostCrisisPlanDialog from '@/components/calls/PostCrisisPlanDialog';
import { SAFETY_PLAN_SECTIONS } from '@/lib/safetyPlan';
import { fetchPostCrisisPlan, type PostCrisisPlan, type PostCrisisSourceType } from '@/lib/postCrisisPlan';

/** Janela aproximada para oferecer o plano depois do atendimento (o banco confere as 2 h). */
const LATE_PLAN_WINDOW_MS = 5 * 60 * 60 * 1000;

/**
 * Histórico do psicólogo: o plano pós-crise que ele deixou neste atendimento.
 * Mostra o que foi recomendado, não o que o paciente fez com ele.
 */
const PostCrisisPlanSummary = ({
  sourceType,
  sourceId,
  occurredAt,
}: {
  sourceType: PostCrisisSourceType;
  sourceId: string;
  occurredAt: string;
}) => {
  const [plan, setPlan] = useState<PostCrisisPlan | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);

  const load = useCallback(() => {
    fetchPostCrisisPlan(sourceType, sourceId)
      .then(setPlan)
      .catch(() => setPlan(null))
      .finally(() => setLoaded(true));
  }, [sourceType, sourceId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!loaded) return null;
  const recent = Date.now() - new Date(occurredAt).getTime() < LATE_PLAN_WINDOW_MS;
  if (!plan && !recent) return null;

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10" aria-hidden="true">
          <ShieldCheck className="h-4 w-4 text-primary" />
        </span>
        <p className="flex-1 text-sm font-medium text-foreground">Plano pós-crise</p>
        {(plan ? plan.editable : recent) && (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            {plan ? 'Editar' : 'Deixar um plano'}
          </Button>
        )}
      </div>

      {plan ? (
        <>
          <p className="text-sm text-foreground">{plan.title}</p>
          {SAFETY_PLAN_SECTIONS.filter((s) => plan.lists[s.key].length > 0).map((s) => (
            <div key={s.key}>
              <p className="text-xs font-semibold text-muted-foreground">{s.shortLabel}</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-foreground">
                {plan.lists[s.key].map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            {plan.delivered
              ? 'Entregue ao paciente. Ele decide se salva nos planos dele.'
              : 'O paciente recebe quando o atendimento terminar.'}
          </p>
        </>
      ) : (
        <p className="text-xs text-muted-foreground">
          Até 2 horas depois do atendimento você ainda pode deixar um plano de segurança para o paciente.
        </p>
      )}

      <PostCrisisPlanDialog
        open={editing}
        onOpenChange={(open) => {
          setEditing(open);
          if (!open) load();
        }}
        sourceType={sourceType}
        sourceId={sourceId}
      />
    </div>
  );
};

export default PostCrisisPlanSummary;
