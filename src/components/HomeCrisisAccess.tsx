import { Phone } from "lucide-react";

/**
 * Acesso rápido ao CVV/SAMU direto na home, fora de uma crise já em
 * andamento (o botão de SOS já cobre isso). Feature nova, aprovada por
 * Henrique na Fase 8 — corrige uma lacuna real: o plano original
 * presumia que isso já existia (SafetyPlanModal/SafetyPlanPrompt), mas
 * nenhum dos dois componentes chegou a ser implementado.
 */
const HomeCrisisAccess = () => (
  <section className="mt-4 mb-4 rounded-xl border border-border bg-muted/40 p-4">
    <p className="text-sm font-medium text-foreground">Precisa conversar agora?</p>
    <p className="text-xs text-muted-foreground mt-0.5">
      Ligações gratuitas, a qualquer hora.
    </p>
    <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2">
      <a
        href="tel:188"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
      >
        <Phone className="h-3.5 w-3.5" />
        CVV: 188
      </a>
      <a
        href="tel:192"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
      >
        <Phone className="h-3.5 w-3.5" />
        SAMU: 192
      </a>
    </div>
  </section>
);

export default HomeCrisisAccess;
