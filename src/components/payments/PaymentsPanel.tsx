import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  CreditCard,
  RefreshCw,
  Eye,
  Check,
  DollarSign,
  Calendar,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { usePayments } from '@/hooks/usePayments';
import { PaymentDetailsModal } from './PaymentDetailsModal';

export const PaymentsPanel = () => {
  const { payments, loading, confirmPayment, syncPayments } = usePayments();
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [processingPayment, setProcessingPayment] = useState<string | null>(null);

  const handleConfirmPayment = async (psychologist_id: string) => {
    try {
      setProcessingPayment(psychologist_id);
      await confirmPayment(psychologist_id);
    } catch (error) {
      // Error handled in hook
    } finally {
      setProcessingPayment(null);
    }
  };

  const handleSyncPayments = async () => {
    try {
      await syncPayments();
    } catch (error) {
      // Error handled in hook
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getPixTypeLabel = (type?: string) => {
    const types: Record<string, string> = {
      cpf: 'CPF',
      email: 'E-mail',
      phone: 'Telefone',
      random_key: 'Chave Aleatória'
    };
    return types[type || ''] || type || 'N/A';
  };

  const totalPending = payments.reduce((sum, payment) => sum + payment.total_pending_amount, 0);
  const totalPaid = payments.reduce((sum, payment) => sum + payment.total_paid_amount, 0);
  const pendingPayments = payments.filter(p => p.total_pending_amount > 0).length;

  if (loading && !payments.length) {
    return <SkeletonSectionCard rows={5} accent="primary" />;
  }

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="h-6 w-6" />
            Gerenciamento de Pagamentos
          </h2>
          <p className="text-muted-foreground">
            Controle os pagamentos semanais dos psicólogos
          </p>
        </div>
        <Button onClick={handleSyncPayments} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Sincronizar
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pendente</CardTitle>
            <AlertTriangle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(totalPending)}
            </div>
            <p className="text-xs text-muted-foreground">
              {pendingPayments} psicólogos com pagamentos pendentes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pago</CardTitle>
            <Check className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {formatCurrency(totalPaid)}
            </div>
            <p className="text-xs text-muted-foreground">
              Pagamentos confirmados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Psicólogos Ativos</CardTitle>
            <DollarSign className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payments.length}</div>
            <p className="text-xs text-muted-foreground">
              Com histórico de pagamentos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Pagamentos</CardTitle>
          <CardDescription>
            Consultas agendadas = R$ 90,00 | Emergências = R$ 50,00
          </CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Nenhum pagamento encontrado. Execute a sincronização para carregar dados.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>PIX</TableHead>
                    <TableHead className="text-center">Agendadas Pendentes</TableHead>
                    <TableHead className="text-center">Emergências Pendentes</TableHead>
                    <TableHead className="text-right">Valor Pendente</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div>{payment.name}</div>
                          {payment.crp && (
                            <div className="text-sm text-muted-foreground">
                              CRP: {payment.crp}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{payment.email}</TableCell>
                      <TableCell>
                        {payment.pix_key ? (
                          <div>
                            <div className="font-mono text-sm">{payment.pix_key}</div>
                            <Badge variant="secondary" className="text-xs">
                              {getPixTypeLabel(payment.pix_type)}
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Não informado</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={payment.scheduled_pending_count > 0 ? "default" : "secondary"}>
                          {payment.scheduled_pending_count}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={payment.emergency_pending_count > 0 ? "default" : "secondary"}>
                          {payment.emergency_pending_count}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        <span className={payment.total_pending_amount > 0 ? "text-primary" : "text-muted-foreground"}>
                          {formatCurrency(payment.total_pending_amount)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedPayment(payment.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {payment.total_pending_amount > 0 && (
                            <Button
                              size="sm"
                              onClick={() => handleConfirmPayment(payment.psychologist_id)}
                              disabled={processingPayment === payment.psychologist_id}
                            >
                              {processingPayment === payment.psychologist_id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Check className="h-4 w-4 mr-1" />
                                  Confirmar
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Details Modal */}
      {selectedPayment && (
        <PaymentDetailsModal
          paymentId={selectedPayment}
          onClose={() => setSelectedPayment(null)}
        />
      )}
    </div>
  );
};