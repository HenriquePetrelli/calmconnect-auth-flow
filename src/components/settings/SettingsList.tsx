import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Lista de configurações no padrão do app: título da seção acima de um cartão
 * branco com borda, e cada linha com ícone numa caixa roxa clara, título,
 * descrição curta e, à direita, uma seta (abre outra tela) ou um controle.
 */

export const SettingsSection = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="space-y-2" aria-label={title}>
    <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
    <Card className="overflow-hidden border-border/60 divide-y divide-border/60">{children}</Card>
  </section>
);

interface SettingsRowProps {
  icon: ReactNode;
  title: string;
  description?: ReactNode;
  /** Linha que leva a outro lugar: vira botão com seta. */
  onClick?: () => void;
  /** Controle à direita (interruptor, seletor, botão). */
  trailing?: ReactNode;
  tone?: "default" | "destructive";
}

export const SettingsRow = ({ icon, title, description, onClick, trailing, tone = "default" }: SettingsRowProps) => {
  const destructive = tone === "destructive";
  const content = (
    <>
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl [&_svg]:h-[18px] [&_svg]:w-[18px]",
          destructive ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary",
        )}
        aria-hidden="true"
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className={cn("text-sm font-medium", destructive ? "text-destructive" : "text-foreground")}>{title}</div>
        {description && <div className="text-xs text-muted-foreground">{description}</div>}
      </div>
      {trailing && <div className="shrink-0">{trailing}</div>}
      {onClick && !trailing && !destructive && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
    </>
  );

  const base = "flex w-full min-h-[68px] items-center gap-4 px-4 py-3 text-left";
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(base, "transition-colors", destructive ? "hover:bg-destructive/5" : "hover:bg-muted/50")}
      >
        {content}
      </button>
    );
  }
  return <div className={base}>{content}</div>;
};
