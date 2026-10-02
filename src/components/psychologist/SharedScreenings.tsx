import { useEffect, useState } from 'react';
import { AlertTriangle, ClipboardList } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { INSTRUMENTS, SEVERITY_LABEL, type Instrument, type Severity } from '@/lib/screenings';

interface SharedRow {
  id: string;
  instrument: Instrument;
  score: number;
  severity: Severity;
  self_harm_flag: boolean;
  created_at: string;
}

/**
 * Questionários (GAD-7, PHQ-9) que o paciente escolheu mostrar. O banco só
 * devolve os compartilhados e só para quem tem consulta com ele.
 */
export const SharedScreenings = ({ patientId }: { patientId: string }) => {
  const [rows, setRows] = useState<SharedRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('mental_health_screenings')
      .select('id, instrument, score, severity, self_harm_flag, created_at')
      .eq('user_id', patientId)
      .eq('shared_with_psychologist', true)
      .order('created_at', { ascending: false })
      .limit(6)
      .then(({ data }) => {
        if (!cancelled) setRows((data ?? []) as SharedRow[]);
      });
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  if (!rows || rows.length === 0) return null;

  return (
    <section className="space-y-2" aria-labelledby="shared-screenings">
      <h3 id="shared-screenings" className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <ClipboardList className="h-4 w-4 text-primary" aria-hidden="true" />
        Questionários compartilhados pelo paciente
      </h3>
      <ul className="divide-y divide-border rounded-lg border border-border">
        {rows.map((row) => (
          <li key={row.id} className="flex items-center justify-between gap-2 p-3 text-sm">
            <span>
              <span className="font-medium text-foreground">{INSTRUMENTS[row.instrument].title}</span>
              <span className="block text-xs text-muted-foreground">{new Date(row.created_at).toLocaleDateString('pt-BR')}</span>
            </span>
            <span className="text-right">
              <span className="font-semibold tabular-nums text-foreground">
                {row.score}/{INSTRUMENTS[row.instrument].maxScore}
              </span>
              <span className="block text-xs text-muted-foreground">{SEVERITY_LABEL[row.severity]}</span>
              {row.self_harm_flag && (
                <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-destructive">
                  <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                  Pergunta 9 positiva
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
};
