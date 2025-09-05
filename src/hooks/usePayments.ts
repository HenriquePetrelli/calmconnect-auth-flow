import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PaymentRecord {
  id: string;
  psychologist_id: string;
  name: string;
  cpf?: string;
  crp?: string;
  email: string;
  pix_key?: string;
  pix_type?: string;
  total_paid_amount: number;
  total_pending_amount: number;
  scheduled_pending_count: number;
  scheduled_paid_count: number;
  emergency_pending_count: number;
  emergency_paid_count: number;
  updated_at: string;
}

export const usePayments = () => {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('psychologist_payments')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      
      setPayments(data || []);
    } catch (error: any) {
      console.error('Error fetching payments:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar pagamentos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const confirmPayment = async (psychologist_id: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('confirm-payment', {
        body: { psychologist_id },
      });
      
      if (error) throw error;
      
      toast({
        title: 'Sucesso',
        description: `Pagamento confirmado! Valor: R$ ${data.amount_paid}`,
      });
      
      await fetchPayments();
      return data;
    } catch (error: any) {
      console.error('Error confirming payment:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao confirmar pagamento',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const syncPayments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('payment-sync');
      
      if (error) throw error;
      
      toast({
        title: 'Sucesso',
        description: 'Sincronização de pagamentos concluída',
      });
      
      await fetchPayments();
      return data;
    } catch (error: any) {
      console.error('Error syncing payments:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao sincronizar pagamentos',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  return {
    payments,
    loading,
    fetchPayments,
    confirmPayment,
    syncPayments,
  };
};