import { Phone } from "lucide-react";

/**
 * Box "Precisa conversar agora?" com CVV e SAMU. Fica na tela de ajuda
 * emergencial (SOS) e nas telas do plano de segurança; saiu da Home em
 * 29/09/2026, a pedido do Henrique.
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
