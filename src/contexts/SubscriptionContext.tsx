import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { withExpiredCancellation } from '@/lib/subscriptionStatus';

interface SubscriptionContextType {
  subscribed: boolean;
  subscriptionTier: string | null;
  subscriptionEnd: string | null;
  planLimits: { appointments: number; sos_uses: number };
  currentUsage: { appointments: number; sos_uses: number };
  canScheduleAppointment: boolean;
  appointmentReason: string | null;
  /** De onde vem o plano: assinatura própria (Stripe) ou benefício da empresa (B2B). */
  entitlementSource: 'stripe' | 'organization' | null;
  /** Nome da empresa, quando o plano vem dela. */
  organizationName: string | null;
  /** Assinatura própria (Stripe) que a pessoa ainda paga, mesmo com o plano da empresa. */
  personalSubscriptionTier: string | null;
  /** Assinatura própria: cancelada, mas ativa até `subscriptionEnd`. */
  cancelAtPeriodEnd: boolean;
  /** Troca para baixo agendada para a renovação. */
  pendingTier: string | null;
  pendingFrom: string | null;
  /** Renovação recusada: o Stripe está tentando cobrar de novo. */
  paymentIssue: boolean;
  /** Assinaturas a mais pagas ao mesmo tempo (cobrança em dobro). */
  extraSubscriptions: number;
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

const CACHE_PREFIX = 'soliv:subscription:';

const readCachedSubscription = (userId: string): unknown | null => {
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + userId);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeCachedSubscription = (userId: string, data: unknown) => {
  try {
    sessionStorage.setItem(CACHE_PREFIX + userId, JSON.stringify(data));
  } catch {
    // armazenamento bloqueado (modo privado): segue sem cache
  }
};

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [subscribed, setSubscribed] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState<string | null>(null);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [planLimits, setPlanLimits] = useState({ appointments: 0, sos_uses: 0 });
  const [currentUsage, setCurrentUsage] = useState({ appointments: 0, sos_uses: 0 });
  const [canScheduleAppointment, setCanScheduleAppointment] = useState(false);
  const [appointmentReason, setAppointmentReason] = useState<string | null>(null);
  const [entitlementSource, setEntitlementSource] = useState<'stripe' | 'organization' | null>(null);
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [personalSubscriptionTier, setPersonalSubscriptionTier] = useState<string | null>(null);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false);
  const [pendingTier, setPendingTier] = useState<string | null>(null);
  const [pendingFrom, setPendingFrom] = useState<string | null>(null);
  const [paymentIssue, setPaymentIssue] = useState(false);
  const [extraSubscriptions, setExtraSubscriptions] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const applySubscriptionData = (raw: any) => {
    // Plano cancelado cujo período pago acabou: já mostra o plano grátis, sem
    // esperar o Stripe e o banco encerrarem (alguns minutos depois).
    const data = withExpiredCancellation(raw ?? {});
    setSubscribed(data.subscribed || false);
    setSubscriptionTier(data.subscription_tier);
    setSubscriptionEnd(data.subscription_end);
    setPlanLimits(data.plan_limits || { appointments: 0, sos_uses: 0 });
    setCurrentUsage(data.current_usage || { appointments: 0, sos_uses: 0 });
    setCanScheduleAppointment(data.can_schedule_appointment ?? false);
    setAppointmentReason(data.appointment_reason ?? null);
    setEntitlementSource(data.entitlement_source ?? null);
    setOrganizationName(data.organization_name ?? null);
    setPersonalSubscriptionTier(data.personal_subscription_tier ?? null);
    setCancelAtPeriodEnd(data.cancel_at_period_end ?? false);
    setPendingTier(data.pending_tier ?? null);
    setPendingFrom(data.pending_from ?? null);
    setPaymentIssue(data.payment_issue ?? false);
    setExtraSubscriptions(data.extra_subscriptions ?? 0);
  };

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

      applySubscriptionData(data);
      writeCachedSubscription(user.id, data);
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
      setEntitlementSource(null);
      setOrganizationName(null);
      setPersonalSubscriptionTier(null);
      setCancelAtPeriodEnd(false);
      setPendingTier(null);
      setPendingFrom(null);
      setPaymentIssue(false);
      setExtraSubscriptions(0);
      setLoading(false);
      return;
    }

    // Mostra na hora o último plano conhecido nesta sessão; a conferência no
    // Stripe (1-2s) roda em seguida e corrige se algo mudou. Só exibição: o
    // servidor confere o plano de novo em cada uso (SOS, agendamento).
    const cached = readCachedSubscription(user.id);
    if (cached) {
      applySubscriptionData(cached);
      setLoading(false);
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

  // Com o app aberto na hora em que o plano cancelado acaba, confere de novo
  // para trocar para o plano grátis sem precisar recarregar.
  useEffect(() => {
    if (!user || !cancelAtPeriodEnd || !subscriptionEnd) return;
    const ms = new Date(subscriptionEnd).getTime() - Date.now();
    if (ms < 0 || ms > 24 * 60 * 60 * 1000) return;
    const timeout = globalThis.setTimeout(() => checkSubscription(), ms + 1000);
    return () => globalThis.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, cancelAtPeriodEnd, subscriptionEnd]);

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
        entitlementSource,
        organizationName,
        personalSubscriptionTier,
        cancelAtPeriodEnd,
        pendingTier,
        pendingFrom,
        paymentIssue,
        extraSubscriptions,
        loading,
        checkSubscription,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};