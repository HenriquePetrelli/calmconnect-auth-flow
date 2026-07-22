import { useState, useMemo, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, Eye, Filter, Download, FileText } from 'lucide-react';
import { useAppointments, type Appointment } from '@/hooks/useAppointments';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';

const ITEMS_PER_PAGE = 10;

export const AppointmentHistory = () => {
  const { appointments, psychologists, loading } = useAppointments();
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [filterPsychologist, setFilterPsychologist] = useState<string>('');
  const [filterMonth, setFilterMonth] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success/10 text-success border-success/20';
      case 'scheduled':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'cancelled':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'declined':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Concluída';
      case 'scheduled':
        return 'Confirmada';
      case 'cancelled':
        return 'Cancelada';
      case 'declined':
        return 'Recusada';
      default:
        return status;
    }
  };

  const filteredAppointments = useMemo(() => {
    return appointments.filter((appointment) => {
      const isHistoryAppointment = ['declined', 'completed'].includes(appointment.status);
      if (!isHistoryAppointment) return false;

      const matchesPsychologist = filterPsychologist === 'all' || !filterPsychologist ||
        appointment.psychologist?.full_name?.toLowerCase().includes(filterPsychologist.toLowerCase());

      const matchesMonth = filterMonth === 'all' || !filterMonth ||
        format(new Date(appointment.scheduled_at), 'yyyy-MM') === filterMonth;

      return matchesPsychologist && matchesMonth;
    });
  }, [appointments, filterPsychologist, filterMonth]);

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    appointments.forEach((a) => {
      if (['declined', 'completed'].includes(a.status)) {
        months.add(format(new Date(a.scheduled_at), 'yyyy-MM'));
      }
    });
    return Array.from(months).sort().reverse();
  }, [appointments]);

  const formatMonthLabel = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  const totalPages = Math.max(1, Math.ceil(filteredAppointments.length / ITEMS_PER_PAGE));
  const paginatedAppointments = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAppointments.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAppointments, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterPsychologist, filterMonth]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const exportToCSV = () => {
    if (filteredAppointments.length === 0) return;
    const rows = [
      ['Data', 'Hora', 'Psicólogo', 'Especialidade', 'Status'],
      ...filteredAppointments.map((a) => [
        format(new Date(a.scheduled_at), 'dd/MM/yyyy'),
        format(new Date(a.scheduled_at), 'HH:mm'),
        a.psychologist?.full_name || 'Não identificado',
        a.psychologist?.specialty || '',
        getStatusText(a.status),
      ]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `historico-consultas-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const exportToPDF = () => {
    if (filteredAppointments.length === 0) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Histórico de Consultas', 20, 20);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 20, 28);

    let y = 40;
    filteredAppointments.forEach((a, i) => {
      if (y > 275) {
        doc.addPage();
        y = 20;
      }
      const date = format(new Date(a.scheduled_at), 'dd/MM/yyyy HH:mm');
      const name = a.psychologist?.full_name || 'Não identificado';
      doc.setFontSize(11);
      doc.text(`${i + 1}. ${name}`, 20, y);
      doc.setFontSize(9);
      doc.text(`${date}  -  ${getStatusText(a.status)}`, 25, y + 5);
      if (a.psychologist?.specialty) {
        doc.text(`Especialidade: ${a.psychologist.specialty}`, 25, y + 10);
        y += 5;
      }
      y += 14;
    });
    doc.save(`historico-consultas-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };


  if (loading) {
    return <SkeletonSectionCard rows={6} accent="muted" />;
  }

  return (
    <>
      <Card className="border-l-4 border-l-muted-foreground/30">
        <CardHeader className="bg-gradient-to-r from-muted/30 to-transparent">
          <div className="flex flex-col gap-4">
            <CardTitle className="flex items-center gap-3">
              <div className="w-10 h-10 bg-muted-foreground/10 rounded-full flex items-center justify-center flex-shrink-0">
                <Calendar className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-foreground">Histórico de Consultas</h3>
                <p className="text-sm text-muted-foreground font-normal">Consultas realizadas e canceladas</p>
              </div>
            </CardTitle>
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Filter className="h-4 w-4" />
                <span className="text-xs font-medium">Filtros:</span>
              </div>
              <Select value={filterPsychologist} onValueChange={setFilterPsychologist}>
                <SelectTrigger className="w-full sm:w-52 h-9 text-sm">
                  <SelectValue placeholder="Filtrar por psicólogo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os psicólogos</SelectItem>
                  {psychologists.map((psy) => (
                    <SelectItem key={psy.user_id} value={psy.full_name}>
                      {psy.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger className="w-full sm:w-44 h-9 text-sm">
                  <SelectValue placeholder="Selecionar mês" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os meses</SelectItem>
                  {availableMonths.map((m) => (
                    <SelectItem key={m} value={m}>
                      {formatMonthLabel(m).charAt(0).toUpperCase() + formatMonthLabel(m).slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex gap-2 sm:ml-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportToPDF}
                  disabled={filteredAppointments.length === 0}
                  className="gap-1.5"
                >
                  <FileText className="h-4 w-4" />
                  PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportToCSV}
                  disabled={filteredAppointments.length === 0}
                  className="gap-1.5"
                >
                  <Download className="h-4 w-4" />
                  CSV
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {filteredAppointments.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Calendar className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Nenhuma consulta encontrada</p>
            </div>
          ) : (
            <>
              {/* Mobile: card list */}
              <div className="space-y-3 md:hidden">
                {paginatedAppointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="rounded-lg border bg-card p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-foreground break-words">
                          {appointment.psychologist?.full_name || 'Psicólogo não identificado'}
                        </div>
                        {appointment.psychologist?.specialty && (
                          <div className="text-xs text-muted-foreground break-words">
                            {appointment.psychologist.specialty}
                          </div>
                        )}
                      </div>
                      <Badge className={`${getStatusColor(appointment.status)} flex-shrink-0`}>
                        {getStatusText(appointment.status)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {format(new Date(appointment.scheduled_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </div>
                      <span>{format(new Date(appointment.scheduled_at), 'HH:mm')}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-1.5"
                      onClick={() => setSelectedAppointment(appointment)}
                    >
                      <Eye className="h-4 w-4" />
                      Ver Detalhes
                    </Button>
                  </div>
                ))}
              </div>

              {/* Desktop/tablet: table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs uppercase tracking-wide">Data/Hora</TableHead>
                      <TableHead className="text-xs uppercase tracking-wide">Psicólogo</TableHead>
                      <TableHead className="text-xs uppercase tracking-wide">Status</TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAppointments.map((appointment) => (
                      <TableRow key={appointment.id}>
                        <TableCell>
                          <div className="text-sm font-medium text-foreground">
                            {format(new Date(appointment.scheduled_at), 'dd/MM/yyyy', { locale: ptBR })}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(appointment.scheduled_at), 'HH:mm')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium text-foreground">{appointment.psychologist?.full_name || 'Psicólogo não identificado'}</div>
                          {appointment.psychologist?.specialty && (
                            <div className="text-xs text-muted-foreground">
                              {appointment.psychologist.specialty}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(appointment.status)}>
                            {getStatusText(appointment.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => setSelectedAppointment(appointment)}
                          >
                            <Eye className="h-4 w-4" />
                            Detalhes
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Página {currentPage} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Próxima
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Appointment Details Modal */}
      <Dialog
        open={!!selectedAppointment}
        onOpenChange={() => setSelectedAppointment(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes da Consulta</DialogTitle>
            <DialogDescription>
              Informações completas sobre a consulta
            </DialogDescription>
          </DialogHeader>

          {selectedAppointment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Data e Hora
                  </label>
                  <p className="text-sm">
                    {format(new Date(selectedAppointment.scheduled_at), 'PPPp', { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Status
                  </label>
                  <p className="text-sm">
                    <Badge className={getStatusColor(selectedAppointment.status)}>
                      {getStatusText(selectedAppointment.status)}
                    </Badge>
                  </p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Psicólogo
                </label>
                <p className="text-sm">{selectedAppointment.psychologist?.full_name || 'Psicólogo não identificado'}</p>
                {selectedAppointment.psychologist?.specialty && (
                  <p className="text-xs text-muted-foreground">
                    {selectedAppointment.psychologist.specialty}
                  </p>
                )}
              </div>

              {selectedAppointment.notes && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Observações Iniciais
                  </label>
                  <p className="text-sm bg-muted p-3 rounded-lg">
                    {selectedAppointment.notes}
                  </p>
                </div>
              )}

              {selectedAppointment.session_summary && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Resumo da Sessão
                  </label>
                  <p className="text-sm bg-muted p-3 rounded-lg">
                    {selectedAppointment.session_summary}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};