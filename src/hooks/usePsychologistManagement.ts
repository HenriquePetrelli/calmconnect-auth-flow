import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PsychologistData {
  id: string;
  full_name: string;
  email: string;
  crp_number: string;
  specialization?: string;
  bio?: string;
  submitted_at: string;
  documents?: string[];
  approval_status: 'pending' | 'approved' | 'rejected';
  reviewed_at?: string;
  reviewed_by?: string;
  rejection_reason?: string;
}

export interface PsychologistRegistration {
  user_id: string;
  full_name: string;
  email: string;
  crp_number: string;
  specialization?: string;
  bio?: string;
  documents?: string[];
}

export const usePsychologistManagement = () => {
  const [loading, setLoading] = useState(false);
  const [pendingPsychologists, setPendingPsychologists] = useState<PsychologistData[]>([]);

  const registerPsychologist = async (data: PsychologistRegistration) => {
    setLoading(true);
    try {
      const response = await fetch('https://ihrrgmmsfuvlasmzdmwf.supabase.co/functions/v1/psychologist-management?action=register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlocnJnbW1zZnV2bGFzbXpkbXdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1NDMzMDcsImV4cCI6MjA2OTExOTMwN30.6hRDCL5alu-Bs4kT4jKYJW3G3zmeBJDZB5udruQzOFU',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      
      if (result.success) {
        toast.success(result.message);
        return { success: true, data: result.data };
      } else {
        throw new Error(result.error || 'Erro no cadastro');
      }
    } catch (error: any) {
      console.error('Erro ao cadastrar psicólogo:', error);
      toast.error(error.message || 'Erro ao realizar cadastro');
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const getPendingPsychologists = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://ihrrgmmsfuvlasmzdmwf.supabase.co/functions/v1/psychologist-management?action=pending', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlocnJnbW1zZnV2bGFzbXpkbXdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1NDMzMDcsImV4cCI6MjA2OTExOTMwN30.6hRDCL5alu-Bs4kT4jKYJW3G3zmeBJDZB5udruQzOFU',
        },
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      
      if (result.success) {
        setPendingPsychologists(result.data);
        return result.data;
      } else {
        throw new Error(result.error || 'Erro ao buscar psicólogos');
      }
    } catch (error: any) {
      console.error('Erro ao buscar psicólogos pendentes:', error);
      toast.error(error.message || 'Erro ao carregar psicólogos pendentes');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const getPsychologistDetails = async (psychologistId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`https://ihrrgmmsfuvlasmzdmwf.supabase.co/functions/v1/psychologist-management?id=${psychologistId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlocnJnbW1zZnV2bGFzbXpkbXdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1NDMzMDcsImV4cCI6MjA2OTExOTMwN30.6hRDCL5alu-Bs4kT4jKYJW3G3zmeBJDZB5udruQzOFU',
        },
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || 'Erro ao buscar detalhes');
      }
    } catch (error: any) {
      console.error('Erro ao buscar detalhes do psicólogo:', error);
      toast.error(error.message || 'Erro ao carregar detalhes');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const approvePsychologist = async (psychologistId: string, adminUserId: string) => {
    setLoading(true);
    try {
      const response = await fetch('https://ihrrgmmsfuvlasmzdmwf.supabase.co/functions/v1/psychologist-management?action=approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlocnJnbW1zZnV2bGFzbXpkbXdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1NDMzMDcsImV4cCI6MjA2OTExOTMwN30.6hRDCL5alu-Bs4kT4jKYJW3G3zmeBJDZB5udruQzOFU',
        },
        body: JSON.stringify({
          psychologist_id: psychologistId,
          admin_user_id: adminUserId
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      
      if (result.success) {
        toast.success(result.message);
        // Atualizar lista de pendentes
        await getPendingPsychologists();
        return { success: true };
      } else {
        throw new Error(result.error || 'Erro na aprovação');
      }
    } catch (error: any) {
      console.error('Erro ao aprovar psicólogo:', error);
      toast.error(error.message || 'Erro ao aprovar psicólogo');
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const rejectPsychologist = async (psychologistId: string, adminUserId: string, rejectionReason?: string) => {
    setLoading(true);
    try {
      const response = await fetch('https://ihrrgmmsfuvlasmzdmwf.supabase.co/functions/v1/psychologist-management?action=reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlocnJnbW1zZnV2bGFzbXpkbXdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1NDMzMDcsImV4cCI6MjA2OTExOTMwN30.6hRDCL5alu-Bs4kT4jKYJW3G3zmeBJDZB5udruQzOFU',
        },
        body: JSON.stringify({
          psychologist_id: psychologistId,
          admin_user_id: adminUserId,
          rejection_reason: rejectionReason
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      
      if (result.success) {
        toast.success(result.message);
        // Atualizar lista de pendentes
        await getPendingPsychologists();
        return { success: true };
      } else {
        throw new Error(result.error || 'Erro na rejeição');
      }
    } catch (error: any) {
      console.error('Erro ao rejeitar psicólogo:', error);
      toast.error(error.message || 'Erro ao rejeitar psicólogo');
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const checkPsychologistApproval = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('psychologists')
        .select('approval_status, approved')
        .eq('user_id', userId)
        .single();

      if (error) {
        // Se não existe registro, usuário não é psicólogo
        return { isApproved: false, status: 'not_registered' };
      }

      return {
        isApproved: data.approved && data.approval_status === 'approved',
        status: data.approval_status
      };
    } catch (error: any) {
      console.error('Erro ao verificar aprovação:', error);
      return { isApproved: false, status: 'error' };
    }
  };

  const validateCrpUnique = async (crp: string, excludeId?: string) => {
    try {
      const { data, error } = await supabase.rpc('validate_unique_crp', {
        crp_input: crp,
        exclude_id: excludeId || null
      });

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Erro ao validar CRP:', error);
      return false;
    }
  };

  return {
    loading,
    pendingPsychologists,
    registerPsychologist,
    getPendingPsychologists,
    getPsychologistDetails,
    approvePsychologist,
    rejectPsychologist,
    checkPsychologistApproval,
    validateCrpUnique
  };
};