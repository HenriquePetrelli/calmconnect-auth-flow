import { useState, useEffect } from 'react';
import { SkeletonSectionCard } from '@/components/skeletons/Skeletons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
import { History, Search, Download, Eye, FileText, Calendar, User } from 'lucide-react';
import { usePsychologistSchedule } from '@/hooks/usePsychologistSchedule';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AppointmentDetail {
  id: string;
  patient_id: string;
  psychologist_id: string;
  scheduled_at: string;
  status: string;
  appointment_type: string;
  notes?: string;
  session_summary?: string;
  created_at: string;
  updated_at: string;
  patient: {
    full_name: string;
  };
}

const ConsultationHistory = () => {
  const { fetchAppointmentHistory, updateAppointment } = usePsychologistSchedule();
  const [appointments, setAppointments] = useState<AppointmentDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentDetail | null>(null);
  const [sessionSummary, setSessionSummary] = useState('');
  const [savingSummary, setSavingSummary] = useState(false);

  const itemsPerPage = 10;

  useEffect(() => {
    loadAppointments();
  }, [currentPage]);

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const result = await fetchAppointmentHistory(currentPage, itemsPerPage);
      if (result) {
        setAppointments(result.appointments);
        setTotalPages(result.totalPages);
        setTotalCount(result.totalCount);
      }
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: any }> = {
      pending: { label: 'Pendente', variant: 'outline' },
      scheduled: { label: 'Agendada', variant: 'secondary' },
      confirmed: { label: 'Confirmada', variant: 'secondary' },
      in_progress: { label: 'Em andamento', variant: 'secondary' },
      completed: { label: 'Concluída', variant: 'default' },
      cancelled: { label: 'Cancelada', variant: 'destructive' },
      declined: { label: 'Recusada', variant: 'destructive' },
      no_show: { label: 'Faltou', variant: 'outline' },
      reschedule_proposed: { label: 'Reagendamento proposto', variant: 'outline' },
      expired: { label: 'Expirada', variant: 'outline' },
    };

    const statusInfo = statusMap[status] || { label: status, variant: 'outline' };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const typeMap: Record<string, { label: string; className: string }> = {
      regular: { label: 'Regular', className: 'bg-secondary/15 text-secondary' },
      emergency: { label: 'Emergência', className: 'bg-destructive/15 text-destructive' },
      follow_up: { label: 'Retorno', className: 'bg-success/15 text-success' }
    };

    const typeInfo = typeMap[type] || { label: type, className: 'bg-muted text-foreground' };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeInfo.className}`}>
        {typeInfo.label}
      </span>
    );
  };

  const filteredAppointments = appointments.filter((appointment) => {
    const matchesSearch = searchTerm === '' || 
      appointment.patient.full_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || appointment.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleSaveSummary = async () => {
    if (!selectedAppointment) return;
    
    setSavingSummary(true);
    try {
      await updateAppointment(selectedAppointment.id, { 
        sessionSummary: sessionSummary,
        status: 'completed'
      });
      
      // Update local state
      setAppointments(prev => prev.map(apt => 
        apt.id === selectedAppointment.id 
          ? { ...apt, session_summary: sessionSummary, status: 'completed' }
          : apt
      ));
      
      setSelectedAppointment(null);
      setSessionSummary('');
    } catch (error) {
      console.error('Error saving summary:', error);
    } finally {
      setSavingSummary(false);
    }
  };

  const handleExportCSV = () => {
    const csvContent = [
      ['Data', 'Paciente', 'Tipo', 'Status', 'Notas', 'Resumo da Sessão'].join(','),
      ...filteredAppointments.map(apt => [
        format(new Date(apt.scheduled_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
        apt.patient.full_name,
        apt.appointment_type,
        apt.status,
        apt.notes || '',
        apt.session_summary || ''
      ].map(field => `"${field}"`).join(','))
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
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <Label htmlFor="search">Buscar paciente</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Nome do paciente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-48">
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
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
                <Download className="w-4 h-4 mr-2" />
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
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAppointments.map((appointment) => (
                  <TableRow key={appointment.id}>
                    <TableCell className="font-medium">
                      {format(new Date(appointment.scheduled_at), 'dd/MM/yyyy', { locale: ptBR })}
                      <br />
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(appointment.scheduled_at), 'HH:mm', { locale: ptBR })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        {appointment.patient.full_name}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(appointment.status)}
                    </TableCell>
                    <TableCell>
                      <Dialog
                        open={selectedAppointment?.id === appointment.id}
                        onOpenChange={(open) => {
                          if (!open) {
                            setSelectedAppointment(null);
                            setSessionSummary('');
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedAppointment(appointment);
                              setSessionSummary(appointment.session_summary || '');
                            }}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Ver
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Detalhes da Consulta</DialogTitle>
                          </DialogHeader>
                          {selectedAppointment?.id === appointment.id && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label className="font-medium">Paciente</Label>
                                  <p className="text-sm">{selectedAppointment.patient.full_name}</p>
                                </div>
                                <div>
                                  <Label className="font-medium">Data/Hora</Label>
                                  <p className="text-sm">
                                    {format(new Date(selectedAppointment.scheduled_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                                  </p>
                                </div>
                                <div>
                                  <Label className="font-medium">Status</Label>
                                  <div className="text-sm">{getStatusBadge(selectedAppointment.status)}</div>
                                </div>
                              </div>

                              {selectedAppointment.notes && (
                                <div>
                                  <Label className="font-medium">Notas da Consulta</Label>
                                  <p className="text-sm bg-muted p-3 rounded-md mt-1">
                                    {selectedAppointment.notes}
                                  </p>
                                </div>
                              )}

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
                                <Button
                                  onClick={handleSaveSummary}
                                  disabled={savingSummary}
                                >
                                  {savingSummary ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                  ) : (
                                    <FileText className="w-4 h-4 mr-2" />
                                  )}
                                  Salvar Resumo
                                </Button>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col items-center gap-3 mt-6">
            <p className="text-sm text-muted-foreground">
              Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, totalCount)} de {totalCount} consultas
            </p>

            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={() => setCurrentPage(page)}
                      isActive={currentPage === page}
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
    </div>
  );
};

export default ConsultationHistory;