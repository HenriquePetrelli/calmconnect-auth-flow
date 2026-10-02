// Regras de assinatura sem dependências (Stripe, Supabase), para poderem ser
// testadas no vitest (src/test/billing.test.ts) e usadas pelas edge functions.

export type Tier = "Plus" | "Premium";

export interface PlanPrices {
  Plus: string;
  Premium: string;
}

export const PLAN_LIMITS: Record<Tier | "none", { appointments: number; sos_uses: number }> = {
  Plus: { appointments: 0, sos_uses: 1 },
  Premium: { appointments: 1, sos_uses: 1 },
  none: { appointments: 0, sos_uses: 0 },
};

export const tierRank = (tier: string | null | undefined) => (tier === "Premium" ? 2 : tier === "Plus" ? 1 : 0);

export const tierForPrice = (prices: PlanPrices, priceId: string | null | undefined): Tier | null => {
  if (priceId && priceId === prices.Plus) return "Plus";
  if (priceId && priceId === prices.Premium) return "Premium";
  return null;
};

/**
 * Status que dão acesso. `past_due` (renovação recusada, o Stripe ainda está
 * tentando cobrar) mantém o plano durante as novas tentativas, como fazem
 * Spotify, Calm e Headspace: o app avisa para atualizar o cartão, e o acesso
 * só acaba quando o Stripe desiste e cancela a assinatura.
 */
export const LIVE_STATUSES = ["active", "trialing", "past_due"] as const;
export const isLiveStatus = (status: string) => (LIVE_STATUSES as readonly string[]).includes(status);

/** O mínimo de uma assinatura do Stripe que as regras abaixo usam. */
export interface SubscriptionLike {
  id: string;
  status: string;
  created: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
  items: { data: { id: string; price: { id: string } }[] };
  schedule?: string | ScheduleLike | null;
}

export interface ScheduleLike {
  id: string;
  phases: { start_date: number; end_date?: number | null; items: { price: string | { id: string } }[] }[];
}

/**
 * Assinaturas que dão acesso, da melhor para a pior (maior plano; em dia antes
 * de atrasada; mais antiga primeiro). Mais de uma é anomalia (cobrança em
 * dobro) e o app avisa.
 */
export const rankLiveSubscriptions = <T extends SubscriptionLike>(prices: PlanPrices, subscriptions: T[]): T[] =>
  subscriptions
    .filter((sub) => isLiveStatus(sub.status))
    .sort(
      (a, b) =>
        tierRank(tierForPrice(prices, b.items.data[0]?.price.id)) - tierRank(tierForPrice(prices, a.items.data[0]?.price.id)) ||
        Number(a.status === "past_due") - Number(b.status === "past_due") ||
        a.created - b.created,
    );

/** Troca de plano já agendada (ex.: Premium → Plus na renovação), se houver. */
export const pendingChange = (
  prices: PlanPrices,
  subscription: SubscriptionLike,
  nowSeconds: number,
): { tier: Tier; from: number } | null => {
  const schedule = subscription.schedule;
  if (!schedule || typeof schedule === "string") return null;
  const current = tierForPrice(prices, subscription.items.data[0]?.price.id);
  const next = schedule.phases.find((phase) => phase.start_date > nowSeconds);
  if (!next) return null;
  const price = next.items[0]?.price;
  const tier = tierForPrice(prices, typeof price === "string" ? price : price?.id);
  return tier && tier !== current ? { tier, from: next.start_date } : null;
};

export interface StripeState {
  tier: Tier | null;
  status: string | null;
  periodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  pendingTier: Tier | null;
  pendingFrom: string | null;
  extraSubscriptions: number;
}

const iso = (seconds: number) => new Date(seconds * 1000).toISOString();

export const stripeState = <T extends SubscriptionLike>(prices: PlanPrices, subscriptions: T[], nowSeconds: number): StripeState => {
  const live = rankLiveSubscriptions(prices, subscriptions);
  const best = live[0];
  if (!best) {
    return { tier: null, status: null, periodEnd: null, cancelAtPeriodEnd: false, pendingTier: null, pendingFrom: null, extraSubscriptions: 0 };
  }
  const pending = pendingChange(prices, best, nowSeconds);
  return {
    tier: tierForPrice(prices, best.items.data[0]?.price.id),
    status: best.status,
    periodEnd: iso(best.current_period_end),
    cancelAtPeriodEnd: best.cancel_at_period_end,
    pendingTier: pending?.tier ?? null,
    pendingFrom: pending ? iso(pending.from) : null,
    extraSubscriptions: live.length - 1,
  };
};

/** Subir de plano cobra a diferença na hora; descer vale na renovação. */
export const changeDirection = (from: Tier | null, to: Tier): "upgrade" | "downgrade" | "same" =>
  tierRank(to) > tierRank(from) ? "upgrade" : tierRank(to) < tierRank(from) ? "downgrade" : "same";

/**
 * Cancelamento: dentro dos 7 dias do direito de arrependimento (CDC art. 49)
 * acaba na hora e devolve o valor; depois disso o plano segue até o fim do
 * período já pago e não renova (como Calm, Headspace, Spotify e Netflix).
 * Assinatura com pagamento atrasado também acaba na hora: não há período pago
 * a preservar.
 */
export const cancelMode = (withdrawalEligible: boolean, status: string): "immediate" | "period_end" =>
  withdrawalEligible || status === "past_due" ? "immediate" : "period_end";
