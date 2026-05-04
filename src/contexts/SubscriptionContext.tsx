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
  loading: boolean;
  checkSubscription: () => Promise<void>;
  canUseFeature: (feature: 'appointments' | 'sos_uses') => boolean;
  incrementUsage: (feature: 'appointments' | 'sos_uses') => Promise<void>;
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
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  const checkSubscription = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) {
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
    } catch (error) {
      console.error('Error checking subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const canUseFeature = (feature: 'appointments' | 'sos_uses'): boolean => {
    return currentUsage[feature] < planLimits[feature];
  };

  const incrementUsage = async (feature: 'appointments' | 'sos_uses') => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user?.email) return;

      const newUsage = {
        ...currentUsage,
        [feature]: currentUsage[feature] + 1
      };

      const { error } = await supabase
        .from('subscribers')
        .update({ current_usage: newUsage })
        .eq('email', session.session.user.email);

      if (error) {
        console.error('Error updating usage:', error);
        return;
      }

      setCurrentUsage(newUsage);
    } catch (error) {
      console.error('Error incrementing usage:', error);
    }
  };

  useEffect(() => {
    if (!user) {
      setSubscribed(false);
      setSubscriptionTier(null);
      setSubscriptionEnd(null);
      setPlanLimits({ appointments: 0, sos_uses: 0 });
      setCurrentUsage({ appointments: 0, sos_uses: 0 });
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
        loading,
        checkSubscription,
        canUseFeature,
        incrementUsage,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};