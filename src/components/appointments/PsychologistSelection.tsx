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
  const [specialty, setSpecialty] = useState('');
  const [specialties, setSpecialties] = useState<string[]>([]);
  
  const { toast } = useToast();

  const fetchPsychologists = async () => {
    try {
      setLoading(true);
      
      // Fetch from both tables to get complete data
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, specialty')
        .eq('user_type', 'psychologist')
        .eq('registration_status', 'approved');

      if (profilesError) throw profilesError;

      const { data: psychologistsData, error: psychologistsError } = await supabase
        .from('psychologists')
        .select('*')
        .eq('approval_status', 'approved');

      if (psychologistsError) throw psychologistsError;

      // Merge data from both tables
      const mergedData: PsychologistData[] = profilesData?.map(profile => {
        const psychData = psychologistsData?.find(p => p.user_id === profile.user_id);
        return {
          id: psychData?.id || profile.user_id,
          user_id: profile.user_id,
          full_name: profile.full_name || psychData?.full_name || '',
          specialty: profile.specialty,
          specialization: psychData?.specialization,
          bio: psychData?.bio,
          crp_number: psychData?.crp_number,
          city: 'São Paulo', // Mock data - you can get from user's profile later
          address: 'Endereço disponível para consultas presenciais', // Mock data
          age: Math.floor(Math.random() * 20) + 30, // Mock data
        };
      }) || [];

      setPsychologists(mergedData);
      
      // Extract unique specialties for filter
      const uniqueSpecialties = Array.from(
        new Set(
          mergedData
            .map(p => p.specialty || p.specialization)
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

    if (specialty) {
      filtered = filtered.filter(p => 
        p.specialty === specialty || p.specialization === specialty
      );
    }

    if (onlyMyCity) {
      // For now, this doesn't filter anything since we don't have real city data
      // In a real app, you'd filter by the user's city
    }

    setFilteredPsychologists(filtered);
  }, [psychologists, specialty, onlyMyCity]);

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