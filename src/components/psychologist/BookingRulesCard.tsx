import { useEffect, useState } from 'react';
import { Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePsychologistBookingRules } from '@/hooks/usePsychologistBookingRules';
import {
  BUFFER_OPTIONS,
  MAX_ADVANCE_OPTIONS,
  MIN_NOTICE_OPTIONS,
  type BookingRules,
} from '@/lib/bookingRules';

const bufferLabel = (m: number) => (m === 0 ? 'Sem intervalo' : `${m} minutos`);
const noticeLabel = (h: number) => (h === 0 ? 'Sem antecedência mínima' : h < 24 ? `${h}h antes` : `${h / 24} dia${h > 24 ? 's' : ''} antes`);
const advanceLabel = (d: number) => `Até ${d} dias à frente`;

const RuleSelect = ({
  id,
  label,
  hint,
  value,
  options,
  format,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  value: number;
  options: number[];
  format: (n: number) => string;
  onChange: (n: number) => void;
}) => (
  <div className="space-y-1.5">
    <Label htmlFor={id}>{label}</Label>
    <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger id={id} className="min-h-11">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(options.includes(value) ? options : [...options, value].sort((a, b) => a - b)).map((o) => (
          <SelectItem key={o} value={String(o)}>
            {format(o)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    <p className="text-xs text-muted-foreground">{hint}</p>
  </div>
);

/** Buffer between consultations, minimum notice and how far ahead patients can book. */
export const BookingRulesCard = () => {
  const { rules, loading, saving, save } = usePsychologistBookingRules();
  const [draft, setDraft] = useState<BookingRules>(rules);

  useEffect(() => setDraft(rules), [rules]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(rules);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Settings2 className="w-4 h-4 text-primary" />
          Regras de agendamento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <RuleSelect
          id="rule-buffer"
          label="Intervalo entre consultas"
          hint="Tempo livre garantido entre uma consulta e a próxima."
          value={draft.buffer_minutes}
          options={BUFFER_OPTIONS}
          format={bufferLabel}
          onChange={(n) => setDraft((d) => ({ ...d, buffer_minutes: n }))}
        />
        <RuleSelect
          id="rule-notice"
          label="Antecedência mínima"
          hint="O paciente não consegue marcar em cima da hora."
          value={draft.min_notice_hours}
          options={MIN_NOTICE_OPTIONS}
          format={noticeLabel}
          onChange={(n) => setDraft((d) => ({ ...d, min_notice_hours: n }))}
        />
        <RuleSelect
          id="rule-advance"
          label="Agenda aberta até"
          hint="Até quantos dias à frente os pacientes veem seus horários."
          value={draft.max_advance_days}
          options={MAX_ADVANCE_OPTIONS}
          format={advanceLabel}
          onChange={(n) => setDraft((d) => ({ ...d, max_advance_days: n }))}
        />
        <Button variant="outline" className="w-full" onClick={() => save(draft)} disabled={loading || saving || !dirty}>
          {saving ? 'Salvando...' : 'Salvar regras'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default BookingRulesCard;
