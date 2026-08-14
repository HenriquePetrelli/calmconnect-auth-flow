import { useState, useEffect, useMemo } from 'react';
import { SkeletonSectionCard } from '@/components/skeletons/Skeletons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { History, Search, Download, Eye, FileText, User, LifeBuoy, CalendarDays } from 'lucide-react';
import { usePsychologistSchedule } from '@/hooks/usePsychologistSchedule';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type ConsultationKind = 'scheduled' | 'emergency';

interface ConsultationRow {
  id: string;
  kind: ConsultationKind;
  /** ISO date used for ordering and display. */
  occurred_at: string;
  status: string;
  patient_name: string;
  notes?: string | null;
  session_summary?: string | null;
  /** SOS only — clinical record registered in the feedback modal. */
  symptoms?: string[];
  clinical_notes?: string | null;
  rating?: number | null;
}

const ITEMS_PER_PAGE = 10;

const ConsultationHistory = () => {
  const { fetchAppointmentHistory, updateAppointment } = usePsychologistSchedule();
  const [rows, setRows] = useState<ConsultationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState<'all' | ConsultationKind>('all');
  const [selected, setSelected] = useState<ConsultationRow | null>(null);
  const [sessionSummary, setSessionSummary] = useState('');
  const [savingSummary, setSavingSummary] = useState(false);

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Loads scheduled appointments and SOS sessions into a single timeline. */
  const loadHistory = async () => {
    setLoading(true);
    try {
      const [historyResult, emergencyRows] = await Promise.all([
        fetchAppointmentHistory(1, 500),
        loadEmergencyHistory(),
      ]);

      const scheduled: ConsultationRow[] = (historyResult?.appointments ?? []).map((apt: any) => ({
        id: apt.id,
        kind: 'scheduled',
        occurred_at: apt.scheduled_at,
        status: apt.status,
        patient_name: apt.patient?.full_name || 'Paciente',
        notes: apt.notes,
        session_summary: apt.session_summary,
      }));

      const merged = [...scheduled, ...emergencyRows].sort(
        (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
      );

      setRows(merged);
      setCurrentPage(1);
    } catch (error) {
      console.error('Error loading consultation history:', error);
    } finally {
      setLoading(false);
    }
  };

  /** SOS calls attended by the logged psychologist, with the clinical record. */
  const loadEmergencyHistory = async (): Promise<ConsultationRow[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: requests, error } = await supabase
      .from('emergency_requests')
      .select('id, created_at, started_at, ended_at, status, patient_details')
      .eq('accepted_by', user.id)
      .order('created_at', { ascending: false })
      .limit(200);

    if (error || !requests?.length) return [];

    const { data: feedbacks } = await supabase
      .from('session_feedback')
      .select('emergency_request_id, symptoms, clinical_notes, rating')
      .eq('user_id', user.id)
      .in('emergency_request_id', requests.map((r) => r.id));

    const byRequest = new Map((feedbacks ?? []).map((f) => [f.emergency_request_id, f]));

    return requests.map((r) => {
      const details = (r.patient_details ?? {}) as Record<string, any>;
      const feedback = byRequest.get(r.id) as any;
      return {
        id: r.id,
        kind: 'emergency' as const,
        occurred_at: r.started_at || r.created_at,
        status: r.status,
        patient_name: details.full_name || details.name || 'Paciente',
        symptoms: feedback?.symptoms ?? [],
        clinical_notes: feedback?.clinical_notes ?? null,
        rating: feedback?.rating ?? null,
      };
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      pending: {
        label: 'Pendente',
        className: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30',
      },
      accepted: {
        label: 'Aceita',
        className: 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30',
      },
      scheduled: {
        label: 'Agendada',
        className: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30',
      },
      confirmed: {
        label: 'Confirmada',
        className: 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30',
      },
      in_progress: {
        label: 'Em andamento',
        className: 'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/30',
      },
      completed: {
        label: 'Concluída',
        className: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30',
      },
      cancelled: {
        label: 'Cancelada',
        className: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30',
      },
      declined: {
        label: 'Recusada',
        className: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30',
      },
      no_show: {
        label: 'Faltou',
        className: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/30',
      },
      reschedule_proposed: {
        label: 'Reagendamento proposto',
        className: 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30',
      },
      expired: {
        label: 'Expirada',
        className: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/15 dark:text-slate-300 dark:border-slate-500/30',
      },
    };

    const statusInfo = statusMap[status] || {
      label: status,
      className: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/15 dark:text-slate-300 dark:border-slate-500/30',
    };
    return (
      <Badge
        variant="outline"
        className={`${statusInfo.className} font-medium rounded-full px-2.5 py-0.5 text-xs whitespace-nowrap`}
      >
        {statusInfo.label}
      </Badge>
    );
  };

  const getTypeBadge = (kind: ConsultationKind) =>
    kind === 'emergency' ? (
      <Badge variant="outline" className="gap-1 rounded-full border-destructive/30 bg-destructive/10 text-destructive">
        <LifeBuoy className="h-3 w-3" />
        Emergencial
      </Badge>
    ) : (
      <Badge variant="outline" className="gap-1 rounded-full border-secondary/30 bg-secondary/10 text-secondary">
        <CalendarDays className="h-3 w-3" />
        Agendada
      </Badge>
    );

  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        const matchesSearch =
          searchTerm === '' || row.patient_name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || row.status === statusFilter;
        const matchesType = typeFilter === 'all' || row.kind === typeFilter;
        return matchesSearch && matchesStatus && matchesType;
      }),
    [rows, searchTerm, statusFilter, typeFilter]
  );

  const totalCount = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));
  const pageRows = filteredRows.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, typeFilter]);

  const handleSaveSummary = async () => {
    if (!selected || selected.kind !== 'scheduled') return;

    setSavingSummary(true);
    try {
      await updateAppointment(selected.id, {
        sessionSummary,
        status: 'completed',
      });

      setRows((prev) =>
        prev.map((row) =>
          row.id === selected.id ? { ...row, session_summary: sessionSummary, status: 'completed' } : row
        )
      );

      setSelected(null);
      setSessionSummary('');
    } catch (error) {
      console.error('Error saving summary:', error);
    } finally {
      setSavingSummary(false);
    }
  };

  const handleExportCSV = () => {
    const csvContent = [
      ['Data', 'Paciente', 'Tipo', 'Status', 'Sintomas', 'Anotações', 'Resumo da Sessão'].join(','),
      ...filteredRows.map((row) =>
        [
          format(new Date(row.occurred_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
          row.patient_name,
          row.kind === 'emergency' ? 'Emergencial' : 'Agendada',
          row.status,
          (row.symptoms ?? []).join(' | '),
          row.clinical_notes || '',
          row.session_summary || '',
        ]
          .map((field) => `"${String(field).replace(/"/g, '""')}"`)
          .join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `consultas_historico_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return <SkeletonSectionCard rows={6} accent="muted" />;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Histórico de Consultas
            <Badge variant="outline" className="ml-auto">
              {totalCount} total
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-6 flex flex-wrap gap-4">
            <div className="min-w-[200px] flex-1">
              <Label htmlFor="search">Buscar paciente</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Nome do paciente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-44">
              <Label htmlFor="type">Tipo</Label>
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
                <SelectTrigger id="type">
                  <SelectValue placeholder="Filtrar por tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="scheduled">Agendada</SelectItem>
                  <SelectItem value="emergency">Emergencial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="accepted">Aceita</SelectItem>
                  <SelectItem value="scheduled">Agendada</SelectItem>
                  <SelectItem value="confirmed">Confirmada</SelectItem>
                  <SelectItem value="in_progress">Em andamento</SelectItem>
                  <SelectItem value="completed">Concluída</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                  <SelectItem value="declined">Recusada</SelectItem>
                  <SelectItem value="no_show">Faltou</SelectItem>
                  <SelectItem value="reschedule_proposed">Reagendamento proposto</SelectItem>
                  <SelectItem value="expired">Expirada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleExportCSV} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Exportar CSV
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                      Nenhuma consulta encontrada.
                    </TableCell>
                  </TableRow>
                )}
                {pageRows.map((row) => (
                  <TableRow key={`${row.kind}-${row.id}`}>
                    <TableCell className="font-medium">
                      {format(new Date(row.occurred_at), 'dd/MM/yyyy', { locale: ptBR })}
                      <br />
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(row.occurred_at), 'HH:mm', { locale: ptBR })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {row.patient_name}
                      </div>
                    </TableCell>
                    <TableCell>{getTypeBadge(row.kind)}</TableCell>
                    <TableCell>{getStatusBadge(row.status)}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelected(row);
                          setSessionSummary(row.session_summary || '');
                        }}
                      >
                        <Eye className="mr-1 h-4 w-4" />
                        Ver
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="mt-6 flex flex-col items-center gap-3">
            <p className="text-sm text-muted-foreground">
              {totalCount === 0
                ? 'Nenhum registro'
                : `Mostrando ${(currentPage - 1) * ITEMS_PER_PAGE + 1} a ${Math.min(
                    currentPage * ITEMS_PER_PAGE,
                    totalCount
                  )} de ${totalCount} consultas`}
            </p>

            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((page) => Math.abs(page - currentPage) <= 2 || page === 1 || page === totalPages)
                  .map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        isActive={page === currentPage}
                        onClick={() => setCurrentPage(page)}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}

                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </CardContent>
      </Card>

      {/* Details */}
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null);
            setSessionSummary('');
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Consulta</DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-medium">Paciente</Label>
                  <p className="text-sm">{selected.patient_name}</p>
                </div>
                <div>
                  <Label className="font-medium">Data/Hora</Label>
                  <p className="text-sm">
                    {format(new Date(selected.occurred_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <Label className="font-medium">Tipo</Label>
                  <div className="mt-1 text-sm">{getTypeBadge(selected.kind)}</div>
                </div>
                <div>
                  <Label className="font-medium">Status</Label>
                  <div className="mt-1 text-sm">{getStatusBadge(selected.status)}</div>
                </div>
              </div>

              {selected.notes && (
                <div>
                  <Label className="font-medium">Notas da Consulta</Label>
                  <p className="mt-1 rounded-md bg-muted p-3 text-sm">{selected.notes}</p>
                </div>
              )}

              {selected.kind === 'emergency' ? (
                <>
                  <div>
                    <Label className="font-medium">Sintomas apresentados</Label>
                    {selected.symptoms && selected.symptoms.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {selected.symptoms.map((symptom) => (
                          <Badge key={symptom} variant="secondary" className="font-normal">
                            {symptom}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-1 text-sm text-muted-foreground">Nenhum sintoma registrado.</p>
                    )}
                  </div>

                  <div>
                    <Label className="font-medium">Anotações do atendimento</Label>
                    <p className="mt-1 whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">
                      {selected.clinical_notes || 'Nenhuma anotação registrada.'}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <Label htmlFor="summary" className="font-medium">
                      Resumo da Sessão
                    </Label>
                    <Textarea
                      id="summary"
                      value={sessionSummary}
                      onChange={(e) => setSessionSummary(e.target.value)}
                      placeholder="Adicione um resumo da sessão..."
                      rows={6}
                      className="mt-1"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button onClick={handleSaveSummary} disabled={savingSummary}>
                      {savingSummary ? (
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-current" />
                      ) : (
                        <FileText className="mr-2 h-4 w-4" />
                      )}
                      Salvar Resumo
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ConsultationHistory;
