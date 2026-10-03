// Catálogo dos planos mostrado nas telas (preço e benefícios). Fonte única:
// o preço cobrado é o do Stripe (STRIPE_PRICE_PLUS / STRIPE_PRICE_PREMIUM) e os
// limites de uso vêm do servidor (PLAN_LIMITS em supabase/functions/_shared/billing.ts).
// Se o preço mudar no Stripe, mude aqui.

export type PlanTier = 'Plus' | 'Premium';

export interface PlanInfo {
  id: 'plus' | 'premium';
  name: PlanTier;
  price: string;
  period: string;
  features: string[];
  popular?: boolean;
}

export const PLANS: Record<PlanTier, PlanInfo> = {
  Plus: {
    id: 'plus',
    name: 'Plus',
    price: 'R$ 69,90',
    period: '/mês',
    features: ['1 chamada emergencial por mês', 'Duração: 25 minutos', 'Acesso à biblioteca de sons', 'Exercícios de respiração'],
  },
  Premium: {
    id: 'premium',
    name: 'Premium',
    price: 'R$ 120,00',
    period: '/mês',
    features: [
      '1 chamada emergencial por mês',
      '1 consulta agendada por mês',
      'Duração: 50 minutos',
      'Acesso à biblioteca de sons',
      'Exercícios de respiração',
      'Suporte prioritário',
    ],
    popular: true,
  },
};

export const PLAN_LIST: PlanInfo[] = [PLANS.Plus, PLANS.Premium];

export const FREE_PLAN = {
  name: 'Plano Grátis',
  price: 'R$ 0',
  features: ['Acesso à biblioteca de sons', 'Exercícios de respiração básicos'],
};
