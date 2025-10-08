import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Activity {
  name: string;
  date: string;
}

export const useQuarterlyActivities = () => {
  const { user } = useAuth();
  const [quarterlyActivities, setQuarterlyActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQuarterlyActivities = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('patient_statistics')
        .select('quarterly_activities')
        .eq('patient_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data?.quarterly_activities) {
        const activities = (data.quarterly_activities as unknown) as Activity[];
        // Sort by date descending (newest first)
        const sortedActivities = activities.sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setQuarterlyActivities(sortedActivities);
      } else {
        setQuarterlyActivities([]);
      }
    } catch (error) {
      console.error('Error fetching quarterly activities:', error);
      setQuarterlyActivities([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchQuarterlyActivities();
  }, [fetchQuarterlyActivities]);

  return {
    quarterlyActivities,
    loading,
    refreshActivities: fetchQuarterlyActivities
  };
};