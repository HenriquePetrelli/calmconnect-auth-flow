import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface SubscriptionContextType {
  subscribed: boolean;
  subscriptionTier: string | null;
  subscriptionEnd: string | null;
  planLimits: { appointments: number; sos_uses: number };
  currentUsage: { appointments: number; sos_uses: number };
  canScheduleAppointment: boolean;
  appointmentReason: string | null;
  loading: boolean;
  checkSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [subscribed, setSubscribed] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState<string | null>(null);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [planLimits, setPlanLimits] = useState({ appointments: 0, sos_uses: 0 });
  const [currentUsage, setCurrentUsage] = useState({ appointments: 0, sos_uses: 0 });
  const [canScheduleAppointment, setCanScheduleAppointment] = useState(false);
  const [appointmentReason, setAppointmentReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  const checkSubscription = async () => {
    try {
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) {
        console.error('Error checking subscription:', error);
        toast({
          title: "Erro",
          description: "Erro ao verificar assinatura",
          variant: "destructive",
        });
        return;
      }

      setSubscribed(data.subscribed || false);
      setSubscriptionTier(data.subscription_tier);
      setSubscriptionEnd(data.subscription_end);
      setPlanLimits(data.plan_limits || { appointments: 0, sos_uses: 0 });
      setCurrentUsage(data.current_usage || { appointments: 0, sos_uses: 0 });
      setCanScheduleAppointment(data.can_schedule_appointment ?? false);
      setAppointmentReason(data.appointment_reason ?? null);
    } catch (error) {
      console.error('Error checking subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setSubscribed(false);
      setSubscriptionTier(null);
      setSubscriptionEnd(null);
      setPlanLimits({ appointments: 0, sos_uses: 0 });
      setCurrentUsage({ appointments: 0, sos_uses: 0 });
      setCanScheduleAppointment(false);
      setAppointmentReason(null);
      setLoading(false);
      return;
    }

    const scheduleCheck = () => checkSubscription();
    const requestIdleCallback = (globalThis as typeof globalThis & {
      requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => void;
    }).requestIdleCallback;

    if (requestIdleCallback) {
      requestIdleCallback(scheduleCheck, { timeout: 1500 });
      return;
    }

    const timeout = globalThis.setTimeout(scheduleCheck, 500);
    return () => globalThis.clearTimeout(timeout);
  }, [user?.id]);

  return (
    <SubscriptionContext.Provider
      value={{
        subscribed,
        subscriptionTier,
        subscriptionEnd,
        planLimits,
        currentUsage,
        canScheduleAppointment,
        appointmentReason,
        loading,
        checkSubscription,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};