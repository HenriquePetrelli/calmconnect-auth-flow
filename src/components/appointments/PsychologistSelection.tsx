import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { PsychologistFilters } from './PsychologistFilters';
import { PsychologistList, PsychologistData } from './PsychologistList';
import { PsychologistModal } from './PsychologistModal';

interface PsychologistSelectionProps {
  onSelect: (psychologist: PsychologistData) => void;
}

export const PsychologistSelection: React.FC<PsychologistSelectionProps> = ({
  onSelect
}) => {
  const [psychologists, setPsychologists] = useState<PsychologistData[]>([]);
  const [filteredPsychologists, setFilteredPsychologists] = useState<PsychologistData[]>([]);
  const [selectedPsychologist, setSelectedPsychologist] = useState<PsychologistData | null>(null);
  const [loading, setLoading] = useState(false);
  const [patientLocation, setPatientLocation] = useState<{ city: string; state: string } | null>(null);
  
  // Filters
  const [specialty, setSpecialty] = useState('all');
  const [specialties, setSpecialties] = useState<string[]>([]);
  
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchPatientLocation = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('city, state')
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        console.error('Error fetching patient location:', error);
        return;
      }
      
      setPatientLocation({ city: data.city, state: data.state });
    } catch (error) {
      console.error('Error fetching patient location:', error);
    }
  };

  const fetchPsychologists = async () => {
    try {
      setLoading(true);
      
      // Buscar diretamente da tabela psychologists com approved = true
      const { data, error } = await supabase
        .from('psychologists')
        .select('*, total_appointments')
        .eq('approved', true)
        .order('full_name', { ascending: true });
  
      if (error) throw error;
  
      // Mapear para o formato PsychologistData
      const formattedData: PsychologistData[] = data?.map(psych => ({
        id: psych.id,
        user_id: psych.user_id,
        full_name: psych.full_name,
        specialty: psych.specialization, // Usar specialization como specialty
        specialization: psych.specialization,
        bio: psych.bio,
        crp_number: psych.crp_number,
        city: psych.city,
        address: psych.address,
        approved: psych.approved,
        // Adicionar outros campos necessários
        state: psych.state,
        document_url: psych.document_url,
        total_appointments: psych.total_appointments || 0
      })) || [];
  
      setPsychologists(formattedData);
      
      // Extrair especialidades únicas para filtro
      const uniqueSpecialties = Array.from(
        new Set(
          formattedData
            .map(p => p.specialization)
            .filter(Boolean)
        )
      );
      setSpecialties(uniqueSpecialties);
      
    } catch (error: any) {
      console.error('Error fetching psychologists:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar psicólogos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Apply filters
  useEffect(() => {
    let filtered = [...psychologists];

    if (specialty && specialty !== 'all') {
      filtered = filtered.filter(p => 
        p.specialty === specialty || p.specialization === specialty
      );
    }


    setFilteredPsychologists(filtered);
  }, [psychologists, specialty, patientLocation]);

  useEffect(() => {
    fetchPsychologists();
  }, [user?.id]);

  const handlePsychologistSelect = (psychologist: PsychologistData) => {
    setSelectedPsychologist(psychologist);
  };

  const handleSchedule = () => {
    if (selectedPsychologist) {
      onSelect(selectedPsychologist);
      setSelectedPsychologist(null);
    }
  };

  const handleCloseModal = () => {
    setSelectedPsychologist(null);
  };

  return (
    <div className="space-y-6">
      <PsychologistFilters
        specialty={specialty}
        setSpecialty={setSpecialty}
        specialties={specialties}
      />

      <PsychologistList
        psychologists={filteredPsychologists}
        onSelect={handlePsychologistSelect}
        loading={loading}
      />

      <PsychologistModal
        psychologist={selectedPsychologist}
        onClose={handleCloseModal}
        onSchedule={handleSchedule}
      />
    </div>
  );
};