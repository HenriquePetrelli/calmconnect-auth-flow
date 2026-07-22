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

  const filteredAppointments = appointments.filter((appointment) => {
    // Only show declined and completed appointments in history
    const isHistoryAppointment = ['declined', 'completed'].includes(appointment.status);
    
    if (!isHistoryAppointment) return false;

    const matchesPsychologist = filterPsychologist === 'all' || !filterPsychologist || 
      appointment.psychologist?.full_name?.toLowerCase().includes(filterPsychologist.toLowerCase());
    
    const matchesMonth = filterMonth === 'all' || !filterMonth || 
      format(new Date(appointment.scheduled_at), 'yyyy-MM') === filterMonth;

    return matchesPsychologist && matchesMonth;
  });

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Carregando histórico...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted animate-pulse rounded-lg" />
        </CardContent>
      </Card>
    );
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
                  <SelectItem value="2024-01">Janeiro 2024</SelectItem>
                  <SelectItem value="2024-02">Fevereiro 2024</SelectItem>
                  <SelectItem value="2024-03">Março 2024</SelectItem>
                  <SelectItem value="2024-04">Abril 2024</SelectItem>
                  <SelectItem value="2024-05">Maio 2024</SelectItem>
                  <SelectItem value="2024-06">Junho 2024</SelectItem>
                </SelectContent>
              </Select>
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
                {filteredAppointments.map((appointment) => (
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
                    {filteredAppointments.map((appointment) => (
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