import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { X, ChevronDown, Search } from "lucide-react";

export interface MultiSelectGroup {
  titulo: string;
  itens: readonly string[];
}

interface MultiSelectModalProps {
  options: string[];
  selectedValues: string[];
  onSelectionChange: (values: string[]) => void;
  placeholder: string;
  title: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** Mostra as opções em grupos com título (ex.: sintomas por tipo). */
  groups?: MultiSelectGroup[];
  /** Texto curto abaixo do título da janela. */
  description?: string;
  /** Como contar o que foi escolhido: ["sintoma", "sintomas"]. */
  noun?: [singular: string, plural: string];
  /** Borda vermelha quando o campo é obrigatório e ficou vazio. */
  invalid?: boolean;
  id?: string;
}

const normalize = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const MultiSelectModal = ({
  options,
  selectedValues,
  onSelectionChange,
  placeholder,
  title,
  isOpen,
  onOpenChange,
  groups,
  description,
  noun = ["item", "itens"],
  invalid = false,
  id,
}: MultiSelectModalProps) => {
  const [tempSelection, setTempSelection] = useState<string[]>(selectedValues);
  const [query, setQuery] = useState("");

  // Ao abrir, parte do que está escolhido agora (um chip removido fora da
  // janela não volta a aparecer marcado).
  useEffect(() => {
    if (isOpen) {
      setTempSelection(selectedValues);
      setQuery("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const sections = useMemo(() => {
    const base = groups ?? [{ titulo: "", itens: options }];
    const q = normalize(query.trim());
    return base
      .map((group) => ({ ...group, itens: q ? group.itens.filter((item) => normalize(item).includes(q)) : group.itens }))
      .filter((group) => group.itens.length > 0);
  }, [groups, options, query]);

  const count = (n: number) => `${n} ${n === 1 ? noun[0] : noun[1]}`;

  const toggle = (option: string) =>
    setTempSelection((current) => (current.includes(option) ? current.filter((item) => item !== option) : [...current, option]));

  const handleConfirm = () => {
    onSelectionChange(tempSelection);
    onOpenChange(false);
  };

  const removeChip = (item: string) => onSelectionChange(selectedValues.filter((selected) => selected !== item));

  return (
    <div className="space-y-3">
      <button
        id={id}
        type="button"
        onClick={() => onOpenChange(true)}
        aria-haspopup="dialog"
        aria-invalid={invalid || undefined}
        className={cn(
          // Mesmo visual do Input: mesma altura, fundo, borda, fonte e foco.
          "flex h-12 w-full items-center justify-between gap-2 rounded-xl border border-input bg-card px-4 py-3 text-left text-base transition-all duration-200 hover:border-primary/30 focus-visible:outline-none focus-visible:border-secondary focus-visible:ring-2 focus-visible:ring-secondary/30 md:text-sm",
          invalid && "border-destructive",
        )}
      >
        <span className={cn("min-w-0 flex-1 truncate", selectedValues.length === 0 ? "text-muted-foreground" : "text-foreground")}>
          {selectedValues.length === 0 ? placeholder : `${count(selectedValues.length)} ${selectedValues.length === 1 ? "selecionado" : "selecionados"}`}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
      </button>

      {selectedValues.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Selecionados">
          {selectedValues.map((item) => (
            <li
              key={item}
              className="inline-flex max-w-full items-center gap-1 rounded-full bg-primary/10 py-1 pl-3 pr-1 text-xs text-primary"
            >
              <span className="min-w-0 break-words leading-tight">{item}</span>
              <button
                type="button"
                onClick={() => removeChip(item)}
                aria-label={`Remover ${item}`}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-primary/20"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="space-y-1 p-4 pb-2 pr-12 text-left">
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          <div className="relative border-b border-border px-4 pb-3">
            <Search className="pointer-events-none absolute left-7 top-[22px] h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar"
              aria-label="Buscar"
              className="h-11 rounded-xl pl-9"
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
            {sections.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Nada encontrado para "{query}".</p>}
            {sections.map((section) => (
              <section key={section.titulo || "todas"} className="py-2">
                {section.titulo && (
                  <h3 className="sticky top-0 z-10 bg-background py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {section.titulo}
                  </h3>
                )}
                <div className="space-y-1">
                  {section.itens.map((option) => {
                    const checked = tempSelection.includes(option);
                    return (
                      <label
                        key={option}
                        className={cn(
                          "flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                          checked ? "border-primary bg-primary/5" : "border-transparent hover:bg-muted/50",
                        )}
                      >
                        <Checkbox checked={checked} onCheckedChange={() => toggle(option)} className="mt-0.5 shrink-0" />
                        <span className="flex-1 break-words text-sm leading-snug text-foreground">{option}</span>
                      </label>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          <div className="flex items-center gap-2 border-t border-border p-4">
            <span className="flex-1 text-sm text-muted-foreground" aria-live="polite">
              {tempSelection.length === 0 ? "Nenhum selecionado" : `${count(tempSelection.length)}`}
            </span>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm}>Confirmar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MultiSelectModal;
