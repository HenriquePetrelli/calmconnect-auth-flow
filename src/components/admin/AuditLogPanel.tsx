import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { History, Ban, Unlock, Pencil, Trash2 } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { SkeletonTable } from '@/components/skeletons/Skeletons';
import { ContentTransition } from '@/components/skeletons/ContentTransition';
import { useAdminAuditLog, type AuditLogEntry } from '@/hooks/useAdminAuditLog';

const ACTION_LABELS: Record<string, string> = {
  block_patient: 'Bloqueou paciente',
  unblock_patient: 'Desbloqueou paciente',
  delete_patient: 'Excluiu paciente',
  update_patient: 'Editou paciente',
  block_psychologist: 'Bloqueou psicólogo',
  unblock_psychologist: 'Desbloqueou psicólogo',
  delete_psychologist: 'Excluiu psicólogo',
  update_psychologist: 'Editou psicólogo',
};

const ACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  block_patient: Ban,
  block_psychologist: Ban,
  unblock_patient: Unlock,
  unblock_psychologist: Unlock,
  delete_patient: Trash2,
  delete_psychologist: Trash2,
  update_patient: Pencil,
  update_psychologist: Pencil,
};

const ACTION_BADGE_CLASS: Record<string, string> = {
  block_patient: 'bg-destructive/10 text-destructive border-destructive/20',
  block_psychologist: 'bg-destructive/10 text-destructive border-destructive/20',
  unblock_patient: 'bg-success/10 text-success border-success/20',
  unblock_psychologist: 'bg-success/10 text-success border-success/20',
  delete_patient: 'bg-destructive/10 text-destructive border-destructive/20',
  delete_psychologist: 'bg-destructive/10 text-destructive border-destructive/20',
  update_patient: 'bg-primary/10 text-primary border-primary/20',
  update_psychologist: 'bg-primary/10 text-primary border-primary/20',
};

const formatDate = (value: string) =>
  new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

const formatDetails = (entry: AuditLogEntry): string => {
  const d = entry.details || {};
  const parts: string[] = [];
  if (d.duration) parts.push(`período: ${d.duration}`);
  if (d.reason) parts.push(`motivo: ${d.reason}`);
  if (Array.isArray(d.fields_changed) && d.fields_changed.length > 0) {
    parts.push(`campos: ${d.fields_changed.join(', ')}`);
  }
  if (d.email_changed) parts.push('e-mail alterado');
  if (d.password_changed) parts.push('senha alterada');
  return parts.join(' · ') || '—';
};

/** Read-only trail of every block/unblock/edit/delete an admin performed on
 * a patient or psychologist account — written by the admin-* edge
 * functions, never editable from here. */
export const AuditLogPanel = () => {
  const { entries, loading, hasMore, loadMore } = useAdminAuditLog();

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-lg sm:text-xl font-semibold text-foreground">Histórico de Ações Administrativas</h2>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          Todo bloqueio, edição ou exclusão de conta feito por um admin fica registrado aqui — quem fez, quando e por quê.
        </p>
      </div>

      <ContentTransition loading={loading && entries.length === 0} skeleton={<SkeletonTable rows={8} cols={5} />}>
        {entries.length === 0 ? (
          <EmptyState
            icon={History}
            title="Nenhuma ação registrada ainda"
            description="Bloqueios, edições e exclusões de contas vão aparecer aqui assim que acontecerem."
            variant="muted"
          />
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="min-w-[140px]">Quando</TableHead>
                    <TableHead className="min-w-[140px]">Admin</TableHead>
                    <TableHead className="min-w-[160px]">Ação</TableHead>
                    <TableHead className="min-w-[160px]">Alvo</TableHead>
                    <TableHead className="min-w-[200px]">Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => {
                    const Icon = ACTION_ICONS[entry.action] ?? History;
                    return (
                      <TableRow key={entry.id}>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {formatDate(entry.created_at)}
                        </TableCell>
                        <TableCell className="font-medium">{entry.admin_name || 'Admin'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`gap-1.5 ${ACTION_BADGE_CLASS[entry.action] ?? ''}`}>
                            <Icon className="h-3 w-3" />
                            {ACTION_LABELS[entry.action] ?? entry.action}
                          </Badge>
                        </TableCell>
                        <TableCell>{entry.target_name || '—'}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{formatDetails(entry)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {hasMore && (
              <CardContent className="flex justify-center border-t p-3">
                <Button variant="outline" size="sm" onClick={loadMore} disabled={loading}>
                  {loading ? 'Carregando...' : 'Carregar mais'}
                </Button>
              </CardContent>
            )}
          </Card>
        )}
      </ContentTransition>
    </div>
  );
};
