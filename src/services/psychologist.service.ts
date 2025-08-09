import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

export interface PsychologistFormData {
  email: string;
  password: string;
  fullName: string;
  cpf: string;
  crp: string;
  professionalEmail: string;
  specialty: string;
  bio: string;
  state: string;
  city: string;
  accepts_presential: boolean;
  address?: string;
}

export class PsychologistService {
  static async signUpPsychologist(
    formData: PsychologistFormData,
    documentFile?: File
  ): Promise<{ success: boolean; error?: string }> {
    let userId: string | null = null;
    
    try {
      // 1. Validar dados antes de qualquer operação
      const validationError = this.validateFormData(formData);
      if (validationError) {
        return { success: false, error: validationError };
      }

      // 2. Criar usuário no Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            user_type: 'psychologist',
            full_name: formData.fullName,
            cpf: formData.cpf,
            crp: formData.crp,
            professional_email: formData.professionalEmail,
            specialty: formData.specialty,
          },
          emailRedirectTo: `${window.location.origin}/psychologist-login`
        }
      });

      if (authError || !authData.user) {
        throw new Error(authError?.message || 'Falha ao criar usuário');
      }

      userId = authData.user.id;

      // 3. Upload do documento (se existir)
      let documentUrl = '';
      if (documentFile) {
        const uploadResult = await this.uploadDocument(documentFile, userId);
        if (!uploadResult.success) {
          throw new Error(uploadResult.error);
        }
        documentUrl = uploadResult.url || '';
      }

      // 4. Criar perfil completo em transação
      const { data: profileResult, error: dbError } = await supabase.rpc('create_psychologist_profile', {
        p_user_id: userId,
        p_full_name: formData.fullName,
        p_email: formData.email,
        p_crp_number: formData.crp,
        p_specialization: formData.specialty,
        p_bio: formData.bio,
        p_state: formData.state,
        p_city: formData.city,
        p_accepts_presential: formData.accepts_presential,
        p_address: formData.accepts_presential ? formData.address : null,
        p_document_url: documentUrl,
        p_cpf: formData.cpf,
        p_professional_email: formData.professionalEmail
      });

      if (dbError) throw new Error(dbError.message);

      // Type assertion for the stored procedure result
      const result = profileResult as { success?: boolean; error?: string };
      if (!result?.success) {
        throw new Error(result?.error || 'Falha ao criar perfil de psicólogo');
      }

      return { success: true };
    } catch (error) {
      console.error('Erro no cadastro:', error);

      // Rollback: Remover usuário criado se algo falhou
      if (userId) {
        await this.cleanupFailedSignup(userId);
      }

      return {
        success: false,
        error: this.getUserFriendlyError(error),
      };
    }
  }

  private static async uploadDocument(
    file: File,
    userId: string
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { error } = await supabase.storage
        .from('psychologist-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('psychologist-documents')
        .getPublicUrl(filePath);

      return { success: true, url: publicUrl };
    } catch (error) {
      return {
        success: false,
        error: 'Falha no upload do documento. Por favor, tente novamente.',
      };
    }
  }

  private static async cleanupFailedSignup(userId: string): Promise<void> {
    try {
      // 1. Remover do storage se existir
      const { data: files } = await supabase.storage
        .from('psychologist-documents')
        .list(userId);
      
      if (files && files.length > 0) {
        const filesToRemove = files.map(f => `${userId}/${f.name}`);
        await supabase.storage
          .from('psychologist-documents')
          .remove(filesToRemove);
      }

      // 2. Remover registros do banco
      await supabase
        .from('psychologists')
        .delete()
        .eq('user_id', userId);

      await supabase
        .from('psychologist_registrations')
        .delete()
        .eq('user_id', userId);

      await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);

      // 3. Note: Cannot remove user from Auth with client-side code
      // This would require admin privileges or edge function
      console.warn('User cleanup incomplete - auth user remains:', userId);
    } catch (cleanupError) {
      console.error('Erro no cleanup:', cleanupError);
    }
  }

  private static validateFormData(formData: PsychologistFormData): string | null {
    if (!formData.email) return 'Email é obrigatório';
    if (!formData.password) return 'Senha é obrigatória';
    if (!formData.fullName) return 'Nome completo é obrigatório';
    if (!formData.crp) return 'CRP é obrigatório';
    if (!formData.specialty) return 'Especialidade é obrigatória';
    if (!formData.bio || formData.bio.length < 50) return 'Biografia deve ter pelo menos 50 caracteres';
    if (!formData.state) return 'Estado é obrigatório';
    if (!formData.city) return 'Cidade é obrigatória';
    if (formData.accepts_presential && !formData.address) return 'Endereço é obrigatório quando atende presencialmente';
    return null;
  }

  private static getUserFriendlyError(error: unknown): string {
    const defaultMessage = 'Ocorreu um erro durante o cadastro. Por favor, tente novamente.';
    
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      if (message.includes('406')) {
        return 'Erro de comunicação com o servidor. Atualize a página e tente novamente.';
      }
      if (message.includes('400')) {
        return 'Dados inválidos. Verifique as informações fornecidas.';
      }
      if (message.includes('document')) {
        return 'Erro ao enviar documento. O arquivo deve ser PDF, JPG ou PNG (máx. 5MB).';
      }
      if (message.includes('already registered') || message.includes('duplicate')) {
        return 'Este email ou CRP já está cadastrado.';
      }
      if (message.includes('rate limit')) {
        return 'Muitas tentativas. Aguarde alguns minutos.';
      }
      if (message.includes('violates row-level security')) {
        return 'Erro de permissão. Tente novamente em alguns segundos.';
      }
      
      // Return the original error message if it's user-friendly
      if (error.message && error.message.length < 100) {
        return error.message;
      }
    }
    
    return defaultMessage;
  }

  static validateFile(file: File): { valid: boolean; error?: string } {
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    if (!validTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Por favor, envie um arquivo PDF, JPG ou PNG.'
      };
    }
    
    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'O tamanho máximo permitido é 5MB.'
      };
    }
    
    return { valid: true };
  }

  private static handleSupabaseError(error: any): string {
    if (!error) return 'Erro desconhecido';
    
    // Erros de autenticação
    if (error.message?.includes('Email rate limit exceeded')) {
      return 'Muitas tentativas. Aguarde alguns minutos.';
    }
    
    // Erros de storage
    if (error.message?.includes('The resource already exists')) {
      return 'Documento já enviado anteriormente.';
    }
    
    if (error.message?.includes('not found')) {
      return 'Serviço de armazenamento indisponível.';
    }
    
    // Erros de banco de dados
    if (error.code === '23505') {
      return 'CRP ou email já cadastrado.';
    }
    
    return error.message || 'Erro durante a operação.';
  }
}