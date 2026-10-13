import { Check } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import SafetyPlanSectionEditor from '@/components/safety/SafetyPlanSectionEditor';
import { MAX_PLAN_TITLE_LENGTH, SAFETY_PLAN_SECTIONS, type SafetyPlanLists } from '@/lib/safetyPlan';

/**
 * Título e as cinco partes do plano de segurança, sem os contatos. Usado pelo
 * psicólogo no plano pós-crise e pelo paciente ao ajustar uma recomendação.
 */
const SafetyPlanListsForm = ({
  idPrefix,
  title,
  titlePlaceholder,
  onTitleChange,
  lists,
  onListsChange,
}: {
  idPrefix: string;
  title: string;
  titlePlaceholder: string;
  onTitleChange: (title: string) => void;
  lists: SafetyPlanLists;
  onListsChange: (lists: SafetyPlanLists) => void;
}) => {
  const firstEmpty = SAFETY_PLAN_SECTIONS.find((s) => lists[s.key].length === 0)?.key;
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-title`}>Título do plano</Label>
        <Input
          id={`${idPrefix}-title`}
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder={titlePlaceholder}
          maxLength={MAX_PLAN_TITLE_LENGTH}
        />
      </div>
      <Accordion type="single" collapsible defaultValue={firstEmpty} className="space-y-2">
        {SAFETY_PLAN_SECTIONS.map((section, index) => {
          const count = lists[section.key].length;
          return (
            <AccordionItem key={section.key} value={section.key} className="rounded-xl border bg-card px-3">
              <AccordionTrigger className="min-h-12 text-left hover:no-underline">
                <span className="flex items-center gap-3">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      count > 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}
                    aria-hidden="true"
                  >
                    {count > 0 ? <Check className="h-4 w-4" /> : index + 1}
                  </span>
                  <span className="text-sm font-semibold text-foreground">{section.title}</span>
                  {count > 0 && <span className="text-xs text-muted-foreground">({count})</span>}
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <SafetyPlanSectionEditor
                  sectionKey={section.key}
                  items={lists[section.key]}
                  onChange={(next) => onListsChange({ ...lists, [section.key]: next })}
                />
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
};

export default SafetyPlanListsForm;
