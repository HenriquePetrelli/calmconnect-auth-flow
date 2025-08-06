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
  const [onlyMyCity, setOnlyMyCity] = useState(false);
  const [specialty, setSpecialty] = useState('all');
  const [appointmentType, setAppointmentType] = useState('all');
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
        age: psych.age,
        approved: psych.approved,
        // Adicionar outros campos necessários
        state: psych.state,
        accepts_presential: psych.accepts_presential,
        document_url: psych.document_url
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

    if (onlyMyCity) {
      // For now, this doesn't filter anything since we don't have real city data
      // In a real app, you'd filter by the user's city
    }

    if (appointmentType && appointmentType !== 'all') {
      // For now, this doesn't filter anything since we don't have this data in the database
      // In a real app, you'd filter by accepts_presential field
    }

    setFilteredPsychologists(filtered);
  }, [psychologists, specialty, onlyMyCity, appointmentType]);

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
        onlyMyCity={onlyMyCity}
        setOnlyMyCity={setOnlyMyCity}
        specialty={specialty}
        setSpecialty={setSpecialty}
        appointmentType={appointmentType}
        setAppointmentType={setAppointmentType}
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