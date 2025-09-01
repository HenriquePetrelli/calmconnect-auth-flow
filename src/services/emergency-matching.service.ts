import { supabase } from '@/integrations/supabase/client';

interface TranstornoSintoma {
  transtorno: string;
  sintomas: string[];
}

export class EmergencyMatchingService {
  /**
   * Verifica se um psicólogo pode atender um paciente baseado na correspondência
   * entre os transtornos que o psicólogo trata e os sintomas do paciente
   */
  static async canPsychologistHelp(
    psychologistId: string, 
    patientSymptoms: string[]
  ): Promise<boolean> {
    try {
      // 1. Buscar a área de atendimento do psicólogo
      const { data: psychologist, error: psychError } = await supabase
        .from('psychologists')
        .select('area_atendimento')
        .eq('user_id', psychologistId)
        .single();

      if (psychError || !psychologist?.area_atendimento) {
        console.error('Erro ao buscar psicólogo:', psychError);
        return false;
      }

      // 2. Buscar os sintomas associados ao transtorno do psicólogo
      const { data: transtornoData, error: transtornoError } = await supabase
        .from('transtornos_sintomas')
        .select('sintomas')
        .eq('transtorno', psychologist.area_atendimento)
        .single();

      if (transtornoError || !transtornoData?.sintomas) {
        console.error('Erro ao buscar transtorno:', transtornoError);
        return false;
      }

      // 3. Verificar se existe interseção entre sintomas do paciente e do transtorno
      const transtornoSintomas = transtornoData.sintomas;
      const hasMatch = patientSymptoms.some(symptom => 
        transtornoSintomas.includes(symptom)
      );

      return hasMatch;
    } catch (error) {
      console.error('Erro na verificação de correspondência:', error);
      return false;
    }
  }

  /**
   * Filtra lista de psicólogos baseado na correspondência com sintomas do paciente
   */
  static async getMatchingPsychologists(
    patientSymptoms: string[]
  ): Promise<string[]> {
    try {
      // 1. Buscar todos os psicólogos online
      const { data: onlinePsychologists, error: onlineError } = await supabase
        .from('psychologist_presence')
        .select('psychologist_id')
        .not('last_online', 'is', null);

      if (onlineError || !onlinePsychologists) {
        console.error('Erro ao buscar psicólogos online:', onlineError);
        return [];
      }

      // 2. Verificar correspondência para cada psicólogo
      const matchingPsychologists: string[] = [];
      
      for (const presence of onlinePsychologists) {
        const canHelp = await this.canPsychologistHelp(
          presence.psychologist_id,
          patientSymptoms
        );
        
        if (canHelp) {
          matchingPsychologists.push(presence.psychologist_id);
        }
      }

      return matchingPsychologists;
    } catch (error) {
      console.error('Erro ao buscar psicólogos correspondentes:', error);
      return [];
    }
  }

  /**
   * Busca os sintomas de um paciente pelo ID
   */
  static async getPatientSymptoms(patientId: string): Promise<string[]> {
    try {
      const { data: patient, error } = await supabase
        .from('patients')
        .select('sintomas_selecionados')
        .eq('user_id', patientId)
        .single();

      if (error || !patient?.sintomas_selecionados) {
        console.error('Erro ao buscar sintomas do paciente:', error);
        return [];
      }

      return patient.sintomas_selecionados;
    } catch (error) {
      console.error('Erro ao buscar sintomas do paciente:', error);
      return [];
    }
  }
}