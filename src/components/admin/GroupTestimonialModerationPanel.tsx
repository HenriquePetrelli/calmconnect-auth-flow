import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { AlertTriangle, Flag, FlagOff, MessageSquareWarning, Pencil, ThumbsDown, ThumbsUp, Trash2 } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { SkeletonTable } from '@/components/skeletons/Skeletons';
import { ContentTransition } from '@/components/skeletons/ContentTransition';
import {
  useGroupTestimonialModeration,
  type AdminGroupTestimonial,
} from '@/hooks/useGroupTestimonialModeration';

const Metric: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-lg border bg-card px-3 py-2.5">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-lg font-semibold text-foreground">{value}</p>
  </div>
);

const REPORT_REASON_LABELS: Record<string, string> = {
  ofensivo: 'Ofensivo',
  risco: 'Risco',
  dados_pessoais: 'Dados pessoais',
  spam: 'Spam',
  outro: 'Outro',
};

const formatDate = (value: string) => new Date(value).toLocaleDateString('pt-BR', { dateStyle: 'short' });

/** Admin moderation of support-group testimonials. Testimonials reported by
 * users sort first, then those with 10+ "não gostei" — nothing gets deleted
 * automatically, an admin reviews and decides. */
export const GroupTestimonialModerationPanel = () => {
  const { testimonials, loading, savingId, updateTestimonial, deleteTestimonial, dismissReports } = useGroupTestimonialModeration();
  const [editTarget, setEditTarget] = useState<AdminGroupTestimonial | null>(null);
  const [editText, setEditText] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<AdminGroupTestimonial | null>(null);

  const flaggedCount = testimonials.filter((t) => t.flagged).length;
  const reportedCount = testimonials.filter((t) => t.pending_reports > 0).length;

  const openEdit = (t: AdminGroupTestimonial) => {
    setEditTarget(t);
    setEditText(t.texto);
  };

  const handleSaveEdit = async () => {
    if (!editTarget) return;
    const ok = await updateTestimonial(editTarget.testimonial_id, editText.trim());
    if (ok) setEditTarget(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const ok = await deleteTestimonial(deleteTarget.testimonial_id);
    if (ok) setDeleteTarget(null);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg sm:text-xl font-semibold text-foreground">Grupos de Apoio — Depoimentos</h2>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          Depoimentos denunciados por usuários ou com 10 ou mais "não gostei" ficam sinalizados aqui para revisão —
          nada é excluído automaticamente. Edite, exclua ou arquive as denúncias quando necessário.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Metric label="Depoimentos totais" value={String(testimonials.length)} />
        <Metric label="Sinalizados p/ revisão" value={String(flaggedCount)} />
        <Metric label="Com denúncias" value={String(reportedCount)} />
      </div>

      <ContentTransition loading={loading} skeleton={<SkeletonTable rows={5} cols={5} />}>
        {testimonials.length === 0 ? (
          <EmptyState
            icon={MessageSquareWarning}
            title="Nenhum depoimento registrado"
            description="Os depoimentos dos grupos de apoio aparecerão aqui."
          />
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/60 hover:bg-muted/60">
                    <TableHead>Grupo</TableHead>
                    <TableHead>Autor</TableHead>
                    <TableHead className="hidden md:table-cell">Depoimento</TableHead>
                    <TableHead className="hidden sm:table-cell">Reações</TableHead>
                    <TableHead className="hidden lg:table-cell">Data</TableHead>
                    <TableHead className="w-20 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {testimonials.map((t) => (
                    <TableRow key={t.testimonial_id} className={t.flagged ? 'bg-destructive/5' : undefined}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {t.flagged && <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />}
                          {t.group_nome}
                        </div>
                      </TableCell>
                      <TableCell>{t.anonimo ? 'Anônimo' : t.autor_nome || '—'}</TableCell>
                      <TableCell className="hidden md:table-cell max-w-xs">
                        <p className="text-sm text-muted-foreground truncate">{t.texto}</p>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="flex items-center gap-1 text-success">
                            <ThumbsUp className="h-3.5 w-3.5" />
                            {t.likes_positivos}
                          </span>
                          <span className={`flex items-center gap-1 ${t.flagged ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                            <ThumbsDown className="h-3.5 w-3.5" />
                            {t.likes_negativos}
                          </span>
                          {t.flagged && (
                            <Badge variant="destructive" className="text-[10px]">
                              Revisar
                            </Badge>
                          )}
                        </div>
                        {t.pending_reports > 0 && (
                          <div className="mt-1 flex items-center gap-1 text-xs text-destructive">
                            <Flag className="h-3.5 w-3.5" />
                            {t.pending_reports} {t.pending_reports === 1 ? 'denúncia' : 'denúncias'}:{' '}
                            {t.report_reasons.map((r) => REPORT_REASON_LABELS[r] ?? r).join(', ')}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {formatDate(t.criado_em)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {t.pending_reports > 0 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => dismissReports(t.testimonial_id)}
                              disabled={savingId === t.testimonial_id}
                              aria-label="Arquivar denúncias (manter depoimento)"
                              title="Arquivar denúncias (manter depoimento)"
                            >
                              <FlagOff className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => openEdit(t)}
                            aria-label="Editar depoimento"
                            title="Editar depoimento"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleteTarget(t)}
                            aria-label="Excluir depoimento"
                            title="Excluir depoimento"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </ContentTransition>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar depoimento</DialogTitle>
            <DialogDescription>
              {editTarget?.group_nome} — {editTarget?.anonimo ? 'Anônimo' : editTarget?.autor_nome || '—'}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="min-h-[140px]"
            maxLength={1000}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={!editText.trim() || savingId === editTarget?.testimonial_id}
            >
              {savingId === editTarget?.testimonial_id ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Excluir este depoimento?
            </AlertDialogTitle>
            <AlertDialogDescription>
              O depoimento de {deleteTarget?.anonimo ? 'um usuário anônimo' : deleteTarget?.autor_nome || 'usuário'}{' '}
              em "{deleteTarget?.group_nome}" será excluído permanentemente. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!savingId}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={!!savingId}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {savingId === deleteTarget?.testimonial_id ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GroupTestimonialModerationPanel;
