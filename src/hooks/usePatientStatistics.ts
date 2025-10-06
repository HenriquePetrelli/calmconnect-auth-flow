import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Activity {
  name: string;
  date: string;
}

interface PatientStatistics {
  recent_activities: Activity[];
}

export const usePatientStatistics = () => {
  const { user } = useAuth();
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStatistics = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('patient_statistics')
        .select('recent_activities')
        .eq('patient_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data?.recent_activities) {
        const activities = (data.recent_activities as unknown) as Activity[];
        setRecentActivities(activities);
      }
    } catch (error) {
      console.error('Error fetching patient statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const addActivity = async (activityName: string) => {
    if (!user) return;

    try {
      const { error } = await supabase.rpc('add_patient_activity', {
        p_patient_id: user.id,
        p_activity_name: activityName,
        p_activity_date: new Date().toISOString()
      });

      if (error) throw error;

      // Refresh activities after adding
      await fetchStatistics();
    } catch (error) {
      console.error('Error adding activity:', error);
    }
  };

  useEffect(() => {
    fetchStatistics();
  }, [user]);

  return {
    recentActivities,
    loading,
    addActivity,
    refreshStatistics: fetchStatistics
  };
};
