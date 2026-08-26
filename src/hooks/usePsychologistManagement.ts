import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PsychologistData {
  id: string;
  user_id?: string;
  full_name: string;
  email: string;
  cpf?: string;
  crp_number: string;
  specialization?: string;
  bio?: string;
  state?: string;
  city?: string;
  address?: string;
  document_url?: string;
  submitted_at: string;
  documents?: string[];
  approval_status: 'pending' | 'approved' | 'rejected';
  reviewed_at?: string;
  reviewed_by?: string;
  rejection_reason?: string;
  pix_key?: string;
  pix_type?: string;
  is_blocked?: boolean;
  blocked_until?: string | null;
  blocked_reason?: string | null;
  blocked_at?: string | null;
}

export interface PsychologistRegistration {
  user_id: string;
  full_name: string;
  email: string;
  cpf?: string;
  crp_number: string;
  specialization: string;
  bio: string;
  state: string;
  city: string;
  address?: string | null;
  document_url: string;
}

export const usePsychologistManagement = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingPsychologists, setPendingPsychologists] = useState<PsychologistData[]>([]);


  const registerPsychologist = async (data: PsychologistRegistration) => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('psychologist-management?action=register', {
        method: 'POST',
        body: data,
      });

      if (error) throw error;
      if (!result.success) throw new Error(result.error || 'Erro no cadastro');

      toast.success(result.message);
      return { success: true, data: result.data };
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
    setError(null);
    try {
      const response = await fetch('https://ihrrgmmsfuvlasmzdmwf.supabase.co/functions/v1/psychologist-management?action=all', {
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
    } catch (err: any) {
      console.error('Erro ao buscar psicólogos:', err);
      setError(err?.message || 'Erro ao carregar psicólogos');
      toast.error(err.message || 'Erro ao carregar psicólogos');
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
      // Verificar tabela psychologists
      const { data: psychologist, error: psychError } = await supabase
        .from('psychologists')
        .select('approval_status, approved, id, is_blocked, blocked_until, blocked_reason')
        .eq('user_id', userId)
        .single();

      if (psychError) {
        // Se não existe registro, usuário não é psicólogo
        return { isApproved: false, status: 'not_registered' };
      }

      const blocked = (psychologist as any).is_blocked === true &&
        (!(psychologist as any).blocked_until || new Date((psychologist as any).blocked_until).getTime() > Date.now());

      if (blocked) {
        return {
          isApproved: false,
          status: 'blocked',
          blockedUntil: (psychologist as any).blocked_until as string | null,
          blockedReason: (psychologist as any).blocked_reason as string | null,
        };
      }

      // Verificar tabela psychologist_registrations
      const { data: registration, error: regError } = await supabase
        .from('psychologist_registrations')
        .select('status')
        .eq('user_id', userId)
        .single();

      // Para aprovação, ambas as tabelas devem ter status 'approved'
      const isPsychApproved = psychologist.approved && psychologist.approval_status === 'approved';
      const isRegApproved = registration && !regError && registration.status === 'approved';

      return {
        isApproved: isPsychApproved && isRegApproved,
        status: psychologist.approval_status
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
    error,
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