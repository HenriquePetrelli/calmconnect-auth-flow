import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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
  
  // Filters
  const [specialty, setSpecialty] = useState('all');
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [specialties, setSpecialties] = useState<string[]>([]);
  
  const { toast } = useToast();

  const fetchPsychologists = async () => {
    try {
      setLoading(true);
      
      // Buscar diretamente da tabela psychologists com approved = true
      const { data, error } = await supabase
        .from('psychologists')
        .select('*')
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
        accepts_presential: psych.accepts_presential,
        document_url: psych.document_url,
        professional_email: psych.professional_email
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

    // No additional filtering needed for onlineOnly since it affects display, not data filtering

    setFilteredPsychologists(filtered);
  }, [psychologists, specialty]);

  useEffect(() => {
    fetchPsychologists();
  }, []);

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
        onlineOnly={onlineOnly}
        setOnlineOnly={setOnlineOnly}
        specialties={specialties}
      />

      <PsychologistList
        psychologists={filteredPsychologists}
        onSelect={handlePsychologistSelect}
        loading={loading}
        onlineOnly={onlineOnly}
      />

      <PsychologistModal
        psychologist={selectedPsychologist}
        onClose={handleCloseModal}
        onSchedule={handleSchedule}
      />
    </div>
  );
};