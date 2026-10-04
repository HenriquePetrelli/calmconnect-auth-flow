import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/PageHeader";
import { SkeletonCardGrid, SkeletonList } from "@/components/skeletons/Skeletons";
import {
  AdminDashboardSkeleton,
  AppointmentsSkeleton,
  CallSkeleton,
  CardListSkeleton,
  ChatListSkeleton,
  CompanyBenefitBodySkeleton,
  FormCardSkeleton,
  HomeSkeleton,
  IconCardSkeleton,
  IntroLinesSkeleton,
  NotificationsBodySkeleton,
  ProfileSkeleton,
  PsychologistAvailabilityBodySkeleton,
  PsychologistDashboardSkeleton,
  PsychologistPaymentsBodySkeleton,
  PsychologistProfileBodySkeleton,
  PublicPageSkeleton,
  QuestionnairesBodySkeleton,
  ScreenSkeleton,
  StatisticsSkeleton,
} from "@/components/skeletons/PageSkeletons";

/** Blocos altos e arredondados (hábitos, planos, diário). */
const Blocks = ({ count, height = "h-32" }: { count: number; height?: string }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <Skeleton key={i} className={`${height} w-full rounded-2xl`} />
    ))}
  </div>
);

const screen = (title: string, body: ReactNode, maxWidth?: string) => (
  <ScreenSkeleton title={title} maxWidth={maxWidth}>
    {body}
  </ScreenSkeleton>
);

/**
 * Skeleton de cada endereço, na ordem: o primeiro que casa vale. Endereços
 * novos sem entrada aqui caem no último item (cabeçalho + lista), nunca no
 * skeleton de outra tela.
 */
const ROUTES: { match: RegExp; render: () => ReactNode }[] = [
  // Públicas: só o fundo (a tela de entrada aparece em seguida).
  { match: /^\/($|signup-type|patient-signup|psychologist-signup|reset-password|termos|privacidade)/, render: () => <PublicPageSkeleton /> },

  // Paciente, telas com a barra do app (sem cabeçalho roxo).
  { match: /^\/home\/?$/, render: () => <HomeSkeleton /> },
  { match: /^\/profile\/?$/, render: () => <ProfileSkeleton /> },
  { match: /^\/appointments\/?$/, render: () => <AppointmentsSkeleton /> },
  { match: /^\/chat\/?$/, render: () => <ChatListSkeleton /> },
  { match: /^\/statistics\/activity-history/, render: () => screen("Histórico completo", <SkeletonList count={6} />, "max-w-3xl") },
  { match: /^\/statistics\/?$/, render: () => <StatisticsSkeleton /> },
  { match: /^\/notifications\/?$/, render: () => <NotificationsBodySkeleton /> },

  // Paciente, telas com cabeçalho roxo.
  { match: /^\/habitos\/?$/, render: () => screen("Meus hábitos", <><IntroLinesSkeleton lines={1} /><Blocks count={2} /></>) },
  { match: /^\/habitos\//, render: () => screen("", <Blocks count={3} height="h-24" />) },
  { match: /^\/journal/, render: () => screen("Meu Diário", <Blocks count={3} height="h-24" />) },
  { match: /^\/support-groups/, render: () => screen("Grupos de Apoio", <CardListSkeleton count={4} />) },
  { match: /^\/support-group\//, render: () => screen("", <CardListSkeleton count={4} />) },
  { match: /^\/safety-plan\/?$/, render: () => screen("Planos de segurança", <><IntroLinesSkeleton lines={3} /><Skeleton className="h-11 w-full rounded-lg" /><Blocks count={2} height="h-20" /></>) },
  { match: /^\/safety-plan\//, render: () => screen("", <><FormCardSkeleton fields={2} /><FormCardSkeleton fields={2} /></>) },
  { match: /^\/beneficio-empresa/, render: () => screen("Benefício da empresa", <CompanyBenefitBodySkeleton />) },
  { match: /^\/empresa/, render: () => screen("Portal da empresa", <><CompanyBenefitBodySkeleton /><CardListSkeleton count={2} /></>) },
  { match: /^\/sounds\/?$/, render: () => screen("Sons terapêuticos", <><IconCardSkeleton /><SkeletonCardGrid count={3} /></>, "max-w-5xl") },
  { match: /^\/sounds\//, render: () => screen("", <CardListSkeleton count={4} />, "max-w-4xl") },
  { match: /^\/breathing/, render: () => screen("Respiração Guiada", <CardListSkeleton count={3} />, "max-w-5xl") },
  { match: /^\/comer-com-atencao/, render: () => screen("Comer com atenção", <><IntroLinesSkeleton lines={3} /><IconCardSkeleton withButton /></>, "max-w-xl") },
  { match: /^\/questionarios\/?$/, render: () => screen("Questionários do mês", <><IntroLinesSkeleton lines={4} /><QuestionnairesBodySkeleton /></>) },
  { match: /^\/questionarios\//, render: () => screen("", <CardListSkeleton count={4} />) },
  { match: /^\/sos/, render: () => screen("Solicitar ajuda", <><IconCardSkeleton withButton /><CardListSkeleton count={2} /></>, "max-w-md") },
  { match: /^\/account-settings/, render: () => screen("Alterar Dados da Conta", <><FormCardSkeleton fields={2} /><FormCardSkeleton fields={3} /><Skeleton className="h-72 w-full rounded-xl" /></>, "max-w-md") },
  { match: /^\/(paciente|psicologo)\/suporte/, render: () => screen("Suporte", <FormCardSkeleton fields={3} />, "max-w-3xl") },
  { match: /^\/achievements/, render: () => screen("Minhas conquistas", <CardListSkeleton count={5} />, "max-w-3xl") },
  { match: /^\/subscription-plans/, render: () => screen("Planos de Assinatura", <><IconCardSkeleton withButton /><IconCardSkeleton withButton /></>, "max-w-4xl") },
  { match: /^\/subscription-(success|cancel)/, render: () => <PublicPageSkeleton /> },

  // Chamadas de vídeo.
  { match: /^\/(consultation-call|emergency-call|emergency\/call)/, render: () => <CallSkeleton /> },

  // Psicólogo.
  { match: /^\/psychologist-dashboard/, render: () => <PsychologistDashboardSkeleton /> },
  { match: /^\/psychologist-profile/, render: () => screen("Perfil do Psicólogo", <PsychologistProfileBodySkeleton />, "max-w-3xl") },
  { match: /^\/psychologist-availability/, render: () => screen("Minha Agenda", <PsychologistAvailabilityBodySkeleton />, "max-w-3xl") },
  { match: /^\/psychologist-payments/, render: () => screen("Meus Pagamentos", <PsychologistPaymentsBodySkeleton />, "max-w-5xl") },
  { match: /^\/(psychologist|admin)-notifications/, render: () => <div className="min-h-screen bg-background"><PageHeader title="Notificações" /><div className="px-4 py-6"><NotificationsBodySkeleton /></div></div> },

  // Admin.
  { match: /^\/admin-dashboard/, render: () => <AdminDashboardSkeleton /> },
];

/** Se o endereço tem skeleton próprio (usado no teste de cobertura das rotas). */
export const hasRouteSkeleton = (pathname: string): boolean => ROUTES.some((route) => route.match.test(pathname));

export const routeSkeletonFor = (pathname: string): ReactNode =>
  (ROUTES.find((route) => route.match.test(pathname))?.render ?? (() => screen("", <CardListSkeleton count={3} />)))();

/** Fallback do carregamento das páginas: o skeleton da própria tela. */
const RouteSkeleton = () => {
  const { pathname } = useLocation();
  return <>{routeSkeletonFor(pathname)}</>;
};

export default RouteSkeleton;
