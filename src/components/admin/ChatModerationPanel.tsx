import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Archive, MessageSquare, ShieldAlert } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { SkeletonTable } from '@/components/skeletons/Skeletons';
import { ContentTransition } from '@/components/skeletons/ContentTransition';
import { useChatModeration, type AdminConversaOverview } from '@/hooks/useChatModeration';

const STATUS_LABEL: Record<string, string> = {
  ativa: 'Ativa',
  somente_leitura: 'Somente leitura',
  expirada: 'Expirada',
};

const STATUS_CLASS: Record<string, string> = {
  ativa: 'bg-primary/10 text-primary border-primary/20',
  somente_leitura: 'bg-warning/15 text-warning border-warning/30',
  expirada: 'bg-muted text-muted-foreground border-border',
};

const Metric: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-lg border bg-card px-3 py-2.5">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-lg font-semibold text-foreground">{value}</p>
  </div>
);

const formatDateTime = (value: string | null) =>
  value ? new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';

/** Admin oversight of the chat system: aggregated usage and per-conversation
 * metadata only — message content is never fetched here, by design (see
 * get_admin_conversas_overview / get_chat_usage_metrics). */
export const ChatModerationPanel = () => {
  const { metrics, conversas, loading, archivingId, arquivarConversa } = useChatModeration();
  const [archiveTarget, setArchiveTarget] = useState<AdminConversaOverview | null>(null);

  const handleArchive = async () => {
    if (!archiveTarget) return;
    const ok = await arquivarConversa(archiveTarget.conversa_id);
    if (ok) setArchiveTarget(null);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg sm:text-xl font-semibold text-foreground">Chat — Uso e Moderação</h2>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          Métricas agregadas e metadados das conversas. O conteúdo das mensagens não é exibido — preserva a
          privacidade do atendimento.
        </p>
      </div>

      {metrics && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <Metric label="Conversas totais" value={String(metrics.total_conversas)} />
          <Metric label="Ativas" value={String(metrics.ativas)} />
          <Metric label="Somente leitura" value={String(metrics.somente_leitura)} />
          <Metric label="Expiradas" value={String(metrics.expiradas)} />
          <Metric label="Mensagens (30d)" value={String(metrics.total_mensagens)} />
          <Metric label="Média por conversa" value={String(metrics.avg_mensagens_por_conversa_ativa)} />
        </div>
      )}

      <ContentTransition loading={loading} skeleton={<SkeletonTable rows={5} cols={5} />}>
        {conversas.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="Nenhuma conversa registrada"
            description="As conversas entre pacientes e psicólogos aparecerão aqui."
          />
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/60 hover:bg-muted/60">
                    <TableHead>Paciente</TableHead>
                    <TableHead>Psicólogo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Mensagens</TableHead>
                    <TableHead className="hidden lg:table-cell">Última atividade</TableHead>
                    <TableHead className="w-14 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {conversas.map((c) => (
                    <TableRow key={c.conversa_id}>
                      <TableCell className="font-medium">{c.paciente_nome || '—'}</TableCell>
                      <TableCell>{c.psicologo_nome || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_CLASS[c.status] ?? ''}>
                          {STATUS_LABEL[c.status] ?? c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{c.mensagens_count}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {formatDateTime(c.last_message_at ?? c.updated_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          disabled={c.status === 'expirada'}
                          onClick={() => setArchiveTarget(c)}
                          aria-label="Arquivar conversa"
                          title="Arquivar conversa"
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </ContentTransition>

      <AlertDialog open={!!archiveTarget} onOpenChange={(open) => !open && setArchiveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-warning" />
              Arquivar esta conversa?
            </AlertDialogTitle>
            <AlertDialogDescription>
              A conversa entre {archiveTarget?.paciente_nome || 'paciente'} e{' '}
              {archiveTarget?.psicologo_nome || 'psicólogo'} será marcada como expirada e nenhum dos dois poderá
              enviar novas mensagens. Use isso apenas em caso de denúncia ou uso indevido reportado por outro canal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!archivingId}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleArchive();
              }}
              disabled={!!archivingId}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {archivingId ? 'Arquivando...' : 'Arquivar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ChatModerationPanel;
