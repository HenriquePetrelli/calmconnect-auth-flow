import { useSearchParams } from 'react-router-dom';
import { CalendarClock, History } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageTitle from '@/components/PageTitle';
import UpcomingConsultations from '@/components/psychologist/UpcomingConsultations';
import ConsultationHistory from '@/components/psychologist/ConsultationHistory';

const TABS = ['proximas', 'historico'] as const;
type Tab = (typeof TABS)[number];

const tabTriggerClass =
  'flex items-center justify-center gap-2 rounded-md px-2 py-2.5 text-sm font-medium transition-colors ' +
  'data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm';

/**
 * Consultas do psicólogo: pedidos de agendamento para responder, consultas de
 * hoje e dos próximos dias (com entrar, remarcar, cancelar) e o histórico
 * (consultas e SOS atendidos). A aba fica no endereço (?aba=historico).
 */
const PsychologistConsultations = () => {
  const [params, setParams] = useSearchParams();
  const current = params.get('aba');
  const tab: Tab = TABS.includes(current as Tab) ? (current as Tab) : 'proximas';

  return (
    <div className="space-y-5">
      <PageTitle title="Consultas" description="Pedidos, próximas consultas e histórico de atendimentos" />

      <Tabs
        value={tab}
        onValueChange={(value) => setParams(value === 'proximas' ? {} : { aba: value }, { replace: true })}
        className="space-y-4"
      >
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-lg bg-muted/60 p-1">
          <TabsTrigger value="proximas" className={tabTriggerClass}>
            <CalendarClock className="h-4 w-4 shrink-0" />
            Próximas
          </TabsTrigger>
          <TabsTrigger value="historico" className={tabTriggerClass}>
            <History className="h-4 w-4 shrink-0" />
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="proximas" className="mt-0">
          <UpcomingConsultations />
        </TabsContent>
        <TabsContent value="historico" className="mt-0">
          <ConsultationHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PsychologistConsultations;
