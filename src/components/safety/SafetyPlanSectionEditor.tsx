import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SAFETY_PLAN_SECTIONS, addItem, type SafetyPlanListKey } from '@/lib/safetyPlan';

/** Uma parte do plano de segurança: itens, sugestões para tocar e campo livre. */
export const SafetyPlanSectionEditor = ({
  sectionKey,
  items,
  onChange,
}: {
  sectionKey: SafetyPlanListKey;
  items: string[];
  onChange: (next: string[]) => void;
}) => {
  const section = SAFETY_PLAN_SECTIONS.find((s) => s.key === sectionKey)!;
  const [draft, setDraft] = useState('');
  const remainingSuggestions = section.suggestions.filter(
    (s) => !items.some((i) => i.toLowerCase() === s.toLowerCase())
  );

  const submitDraft = () => {
    onChange(addItem(items, draft));
    setDraft('');
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{section.prompt}</p>

      {items.length > 0 && (
        <ul className="space-y-2" aria-label={`Itens de ${section.title}`}>
          {items.map((item) => (
            <li key={item} className="flex items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2">
              <span className="text-sm text-foreground">{item}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 shrink-0 text-muted-foreground"
                onClick={() => onChange(items.filter((i) => i !== item))}
                aria-label={`Remover "${item}"`}
              >
                <X className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {remainingSuggestions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Toque para adicionar:</p>
          <div className="flex flex-wrap gap-2">
            {remainingSuggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onChange(addItem(items, s))}
                className="inline-flex min-h-10 items-center gap-1 rounded-full border border-dashed border-primary/40 px-3 py-1.5 text-sm text-foreground hover:bg-primary/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              >
                <Plus className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submitDraft();
        }}
      >
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Escrever com as suas palavras"
          aria-label={`Adicionar item em ${section.title}`}
          maxLength={200}
        />
        <Button type="submit" variant="secondary" disabled={!draft.trim()}>
          Adicionar
        </Button>
      </form>
    </div>
  );
};

export default SafetyPlanSectionEditor;
