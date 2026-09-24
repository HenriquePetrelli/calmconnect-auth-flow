import { useEffect, useState } from 'react';
import { FileText, Receipt } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface PayoutLog {
  id: string;
  created_at: string | null;
  amount_paid: number | null;
  scheduled_count: number | null;
  emergency_count: number | null;
  details: { pix_e2e_id?: string; receipt_path?: string | null } | null;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

/** The psychologist's own payout history, with the PIX E2E id and receipt. */
export const PayoutHistory = ({ psychologistId }: { psychologistId: string }) => {
  const [logs, setLogs] = useState<PayoutLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('payment_logs')
        .select('id, created_at, amount_paid, scheduled_count, emergency_count, details')
        .eq('psychologist_id', psychologistId)
        .eq('action', 'payment_confirmed')
        .order('created_at', { ascending: false })
        .limit(24);
      if (!cancelled) {
        setLogs((data ?? []) as PayoutLog[]);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [psychologistId]);

  const openReceipt = async (path: string) => {
    // Opened synchronously so mobile browsers don't block it as a popup.
    // ('noopener' would make window.open return null, so detach manually.)
    const win = window.open('', '_blank');
    if (win) win.opener = null;
    const { data } = await supabase.storage.from('payment-receipts').createSignedUrl(path, 60);
    if (data?.signedUrl && win) win.location.href = data.signedUrl;
    else win?.close();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Receipt className="w-4 h-4" /> Repasses recebidos
        </CardTitle>
        <CardDescription>Cada repasse traz o código E2E do PIX para você conferir no extrato do banco.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum repasse registrado ainda.</p>
        ) : (
          <ul className="space-y-2">
            {logs.map((log) => (
              <li key={log.id} className="rounded-lg border border-border p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{formatCurrency(log.amount_paid ?? 0)}</span>
                  <span className="text-muted-foreground">
                    {log.created_at ? new Date(log.created_at).toLocaleDateString('pt-BR') : '—'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {log.scheduled_count ?? 0} agendada(s) · {log.emergency_count ?? 0} emergência(s)
                </p>
                {log.details?.pix_e2e_id && (
                  <p className="mt-1 break-all font-mono text-xs text-foreground">E2E {log.details.pix_e2e_id}</p>
                )}
                {log.details?.receipt_path && (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto px-0"
                    onClick={() => openReceipt(log.details!.receipt_path!)}
                  >
                    <FileText className="mr-1 h-3.5 w-3.5" /> Ver comprovante
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default PayoutHistory;
