import { useState, useEffect } from 'react';
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
import { Calendar, Eye, Filter } from 'lucide-react';
import { useAppointments, type Appointment } from '@/hooks/useAppointments';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const AppointmentHistory = () => {
  const { appointments, psychologists, loading } = useAppointments();
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [filterPsychologist, setFilterPsychologist] = useState<string>('');
  const [filterMonth, setFilterMonth] = useState<string>('');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Concluída';
      case 'confirmed':
        return 'Confirmada';
      case 'cancelled':
        return 'Cancelada';
      case 'scheduled':
        return 'Agendada';
      default:
        return status;
    }
  };

  const filteredAppointments = appointments.filter((appointment) => {
    const matchesPsychologist = filterPsychologist === 'all' || !filterPsychologist || 
      appointment.psychologist.full_name.toLowerCase().includes(filterPsychologist.toLowerCase());
    
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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Histórico de Consultas
            </CardTitle>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <Select value={filterPsychologist} onValueChange={setFilterPsychologist}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filtrar por psicólogo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {psychologists.map((psy) => (
                    <SelectItem key={psy.user_id} value={psy.full_name}>
                      {psy.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="2024-01">Jan 2024</SelectItem>
                  <SelectItem value="2024-02">Fev 2024</SelectItem>
                  <SelectItem value="2024-03">Mar 2024</SelectItem>
                  {/* Add more months as needed */}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Psicólogo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAppointments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="text-muted-foreground">
                      <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      Nenhuma consulta encontrada
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAppointments.map((appointment) => (
                  <TableRow key={appointment.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {format(new Date(appointment.scheduled_at), 'dd/MM/yyyy', { locale: ptBR })}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(appointment.scheduled_at), 'HH:mm')}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{appointment.psychologist.full_name}</div>
                        {appointment.psychologist.specialty && (
                          <div className="text-sm text-muted-foreground">
                            {appointment.psychologist.specialty}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {appointment.appointment_type === 'emergency' ? 'Emergência' : 'Regular'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(appointment.status)}>
                        {getStatusText(appointment.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedAppointment(appointment)}
                      >
                        <Eye className="h-4 w-4" />
                        Detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
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
                <p className="text-sm">{selectedAppointment.psychologist.full_name}</p>
                {selectedAppointment.psychologist.specialty && (
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