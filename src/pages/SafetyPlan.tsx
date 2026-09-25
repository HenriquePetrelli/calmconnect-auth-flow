import { useEffect, useMemo, useState } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, Plus, Star, Trash2, X } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import PatientBottomNav from '@/components/PatientBottomNav';
import HomeCrisisAccess from '@/components/HomeCrisisAccess';
import { useToast } from '@/hooks/use-toast';
import { useSafetyPlan } from '@/hooks/useSafetyPlan';
import {
  SAFETY_PLAN_SECTIONS,
  TOTAL_PLAN_PARTS,
  addItem,
  countFilledSections,
  isValidPhone,
  telHref,
  type SafetyPlanListKey,
  type SafetyPlanLists,
} from '@/lib/safetyPlan';

const SectionEditor = ({
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

const SafetyPlan = () => {
  const { toast } = useToast();
  const { plan, contacts, loading, saving, savePlan, addContact, removeContact } = useSafetyPlan();
  const [draftPlan, setDraftPlan] = useState<SafetyPlanLists>(plan);
  const [contactName, setContactName] = useState('');
  const [contactRelationship, setContactRelationship] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactPrimary, setContactPrimary] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);

  useEffect(() => {
    setDraftPlan(plan);
  }, [plan]);

  const dirty = useMemo(() => JSON.stringify(draftPlan) !== JSON.stringify(plan), [draftPlan, plan]);
  const filled = countFilledSections(draftPlan, contacts.length);
  // Open the first part that is still empty, so filling in feels step by step.
  const firstEmpty = SAFETY_PLAN_SECTIONS.find((s) => draftPlan[s.key].length === 0)?.key
    ?? (contacts.length === 0 ? 'contacts' : undefined);

  const phoneInvalid = phoneTouched && contactPhone.trim() !== '' && !isValidPhone(contactPhone);

  const handleSave = async () => {
    const ok = await savePlan(draftPlan);
    if (ok) toast({ title: 'Plano salvo' });
  };

  const handleAddContact = async () => {
    setPhoneTouched(true);
    if (!contactName.trim() || !isValidPhone(contactPhone)) return;
    const ok = await addContact({
      name: contactName.trim(),
      relationship: contactRelationship.trim() || null,
      phone: contactPhone.trim(),
      is_primary: contactPrimary || contacts.length === 0,
    });
    if (ok) {
      setContactName('');
      setContactRelationship('');
      setContactPhone('');
      setContactPrimary(false);
      setPhoneTouched(false);
    }
  };

  return (
    <div className="has-tabs">
      <div className="screen">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
          <PageHeader title="Plano de segurança" backTo="/home" />
        </div>

        <main className="p-4 pb-40 space-y-5 max-w-2xl mx-auto">
          <section className="space-y-2">
            <p className="text-foreground">
              Um roteiro seu, escrito com calma, para usar quando as coisas ficarem difíceis. Preencha no seu ritmo —
              dá para voltar e mudar quando quiser.
            </p>
            <p className="text-sm text-muted-foreground">
              Só você vê este plano. Se você pedir ajuda pelo SOS, o psicólogo que atender pode consultá-lo durante o
              atendimento, e esse acesso fica registrado.
            </p>
            {!loading && (
              <p className="text-sm font-medium text-primary" aria-live="polite">
                {filled} de {TOTAL_PLAN_PARTS} partes preenchidas
              </p>
            )}
          </section>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : (
            <Accordion type="single" collapsible defaultValue={firstEmpty} className="space-y-3">
              {SAFETY_PLAN_SECTIONS.map((section, index) => {
                const count = draftPlan[section.key].length;
                return (
                  <AccordionItem key={section.key} value={section.key} className="rounded-xl border bg-card px-4">
                    <AccordionTrigger className="min-h-14 text-left hover:no-underline">
                      <span className="flex items-center gap-3">
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                            count > 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                          }`}
                          aria-hidden="true"
                        >
                          {count > 0 ? <Check className="h-4 w-4" /> : index + 1}
                        </span>
                        <span className="font-medium">{section.title}</span>
                        {count > 0 && <span className="text-xs text-muted-foreground">({count})</span>}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <SectionEditor
                        sectionKey={section.key}
                        items={draftPlan[section.key]}
                        onChange={(next) => setDraftPlan((prev) => ({ ...prev, [section.key]: next }))}
                      />
                    </AccordionContent>
                  </AccordionItem>
                );
              })}

              <AccordionItem value="contacts" className="rounded-xl border bg-card px-4">
                <AccordionTrigger className="min-h-14 text-left hover:no-underline">
                  <span className="flex items-center gap-3">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                        contacts.length > 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}
                      aria-hidden="true"
                    >
                      {contacts.length > 0 ? <Check className="h-4 w-4" /> : SAFETY_PLAN_SECTIONS.length + 1}
                    </span>
                    <span className="font-medium">Pessoas a quem posso pedir ajuda</span>
                    {contacts.length > 0 && <span className="text-xs text-muted-foreground">({contacts.length})</span>}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Quem você gostaria que fosse avisado se precisar de ajuda. O contato principal aparece primeiro.
                  </p>

                  {contacts.length > 0 && (
                    <ul className="space-y-2">
                      {contacts.map((c) => (
                        <li key={c.id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
                          <div className="min-w-0">
                            <p className="flex items-center gap-1 text-sm font-medium text-foreground">
                              {c.is_primary && <Star className="h-3.5 w-3.5 text-primary" aria-label="Contato principal" />}
                              {c.name}
                              {c.relationship && <span className="font-normal text-muted-foreground"> · {c.relationship}</span>}
                            </p>
                            <a href={telHref(c.phone)} className="text-sm text-primary underline-offset-2 hover:underline">
                              {c.phone}
                            </a>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={() => removeContact(c.id)}
                            disabled={saving}
                            aria-label={`Remover ${c.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}

                  <form
                    className="space-y-3 rounded-lg border border-dashed p-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void handleAddContact();
                    }}
                  >
                    <div className="space-y-1.5">
                      <Label htmlFor="contact-name">Nome</Label>
                      <Input id="contact-name" value={contactName} onChange={(e) => setContactName(e.target.value)} maxLength={100} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="contact-relationship">Quem é (opcional)</Label>
                      <Input
                        id="contact-relationship"
                        value={contactRelationship}
                        onChange={(e) => setContactRelationship(e.target.value)}
                        placeholder="Mãe, amigo, parceira..."
                        maxLength={60}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="contact-phone">Telefone</Label>
                      <Input
                        id="contact-phone"
                        type="tel"
                        inputMode="tel"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        onBlur={() => setPhoneTouched(true)}
                        placeholder="(11) 99999-9999"
                        aria-invalid={phoneInvalid}
                        aria-describedby={phoneInvalid ? 'contact-phone-error' : undefined}
                        maxLength={20}
                      />
                      {phoneInvalid && (
                        <p id="contact-phone-error" className="text-sm text-destructive">
                          Confira o número — use só números, com DDD.
                        </p>
                      )}
                    </div>
                    {contacts.length > 0 && (
                      <div className="flex min-h-10 items-center gap-2">
                        <Checkbox
                          id="contact-primary"
                          checked={contactPrimary}
                          onCheckedChange={(v) => setContactPrimary(v === true)}
                        />
                        <Label htmlFor="contact-primary" className="font-normal">Tornar contato principal</Label>
                      </div>
                    )}
                    <Button type="submit" variant="secondary" className="w-full" disabled={saving || !contactName.trim() || !contactPhone.trim()}>
                      Adicionar contato
                    </Button>
                  </form>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}

          <HomeCrisisAccess />
        </main>

        {dirty && (
          <div className="fixed inset-x-0 bottom-20 z-20 px-4">
            <div className="mx-auto max-w-2xl">
              <Button className="w-full min-h-12 shadow-lg" onClick={handleSave} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar plano'}
              </Button>
            </div>
          </div>
        )}
      </div>
      <PatientBottomNav />
    </div>
  );
};

export default SafetyPlan;
