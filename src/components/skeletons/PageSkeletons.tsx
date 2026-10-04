import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/PageHeader";
import { SkeletonList, SkeletonSectionCard, SkeletonStatsGrid } from "@/components/skeletons/Skeletons";

/**
 * Skeletons de página: cada um repete a estrutura da tela que vai aparecer
 * (cabeçalho, cartões, listas), para nada pular de lugar quando os dados
 * chegam. O mesmo skeleton aparece enquanto o código da página baixa
 * (RouteSkeleton) e enquanto ela busca os dados.
 */

/** Tela com o cabeçalho roxo (PageHeader) e o conteúdo centralizado. */
export const ScreenSkeleton = ({
  title,
  maxWidth = "max-w-2xl",
  children,
}: {
  title: string;
  maxWidth?: string;
  children: ReactNode;
}) => (
  <div className="has-tabs" aria-busy="true" aria-label="Carregando">
    <div className="screen">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
        {title ? (
          <PageHeader title={title} />
        ) : (
          <div className="bg-primary">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-2">
              <div className="w-12" />
              <div className="flex-1 flex justify-center">
                <Skeleton className="h-4 w-36 bg-white/25" />
              </div>
              <div className="w-12" />
            </div>
          </div>
        )}
      </div>
      <main className={`p-4 space-y-5 mx-auto w-full ${maxWidth}`}>{children}</main>
    </div>
  </div>
);

/** Linhas de texto curtas, como o parágrafo de introdução das telas. */
export const IntroLinesSkeleton = ({ lines = 2 }: { lines?: number }) => (
  <div className="space-y-2">
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} className={`h-3 ${i === lines - 1 ? "w-2/3" : "w-full"}`} />
    ))}
  </div>
);

/** Cartão com ícone em caixa + título + subtítulo (+ botão opcional). */
export const IconCardSkeleton = ({ withButton = false }: { withButton?: boolean }) => (
  <Card className="border-border/60">
    <CardContent className="p-4 space-y-4">
      <div className="flex items-start gap-3">
        <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      </div>
      {withButton && <Skeleton className="h-10 w-full rounded-lg" />}
    </CardContent>
  </Card>
);

/** Lista de cartões com ícone, como notificações, conquistas e planos. */
export const CardListSkeleton = ({ count = 3 }: { count?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <IconCardSkeleton key={i} />
    ))}
  </div>
);

/** Formulário: rótulos + campos + botão. */
export const FormCardSkeleton = ({ fields = 2, title = true }: { fields?: number; title?: boolean }) => (
  <Card className="border-border/60">
    <CardContent className="p-5 space-y-4">
      {title && <Skeleton className="h-5 w-44" />}
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      ))}
      <Skeleton className="h-10 w-full rounded-lg" />
    </CardContent>
  </Card>
);

/* ------------------------------------------------------------------ */
/* Paciente                                                            */
/* ------------------------------------------------------------------ */

/** Home: "Registre seu humor" + grade "Seus recursos". */
export const HomeSkeleton = () => (
  <div aria-busy="true" aria-label="Carregando">
    <div className="space-y-6">
      <Card className="border-border/60">
        <CardContent className="p-4 flex items-center justify-between gap-3">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="h-4 w-4 rounded" />
        </CardContent>
      </Card>
      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border-border/60">
              <CardContent className="p-4 flex flex-col items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  </div>
);

/** Perfil do paciente: identidade + Plano + Configurações + lista de opções. */
export const ProfileSkeleton = () => (
  <div className="mx-auto w-full max-w-3xl space-y-5" aria-busy="true" aria-label="Carregando">
    <Card className="overflow-hidden border-border/60">
      <div className="p-6 sm:p-7">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <Skeleton className="w-20 h-20 rounded-2xl" />
          <div className="flex-1 min-w-0 space-y-3">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-6 w-32 rounded-full" />
          </div>
          <div className="hidden sm:block">
            <Skeleton className="h-9 w-32 rounded-md" />
          </div>
        </div>
      </div>
    </Card>

    {/* Plano e Configurações: título + subtítulo + seta, sem ícone. */}
    {Array.from({ length: 2 }).map((_, i) => (
      <Card key={i} className="overflow-hidden border-border/60">
        <div className="flex items-center justify-between gap-4 px-4 py-3.5">
          <div className="space-y-2 min-w-0 flex-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-44" />
          </div>
          <Skeleton className="h-4 w-4 rounded shrink-0" />
        </div>
      </Card>
    ))}

    {/* Conta, suporte, termos, privacidade e sair: um cartão com a lista. */}
    <Card className="overflow-hidden border-border/60 divide-y divide-border/60">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-4">
          <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
          <div className="space-y-2 min-w-0 flex-1">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-4 w-4 rounded shrink-0" />
        </div>
      ))}
    </Card>
  </div>
);

/** Consultas: cartão "Agendar Nova Consulta" + próximas + histórico. */
export const AppointmentsSkeleton = () => (
  <div className="space-y-4 max-w-4xl mx-auto" aria-busy="true" aria-label="Carregando">
    <Card className="border-border/60">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-3 w-56" />
          </div>
        </div>
        <Skeleton className="h-10 w-full rounded-lg" />
      </CardContent>
    </Card>
    <SkeletonSectionCard rows={2} accent="primary" />
    <SkeletonSectionCard rows={3} />
  </div>
);

/** Chat: cartão "Conversas" com a lista. */
export const ChatListSkeleton = () => (
  <div className="max-w-4xl mx-auto" aria-busy="true" aria-label="Carregando">
    <SkeletonSectionCard rows={4} accent="primary" />
  </div>
);

/** Meu progresso: sequência, atalhos, humor, metas e visão geral. */
export const StatisticsSkeleton = () => (
  <div className="max-w-4xl mx-auto space-y-4" aria-busy="true" aria-label="Carregando">
    {Array.from({ length: 4 }).map((_, i) => (
      <Card key={i} className="border-border/60">
        <CardContent className="p-4 flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-4 w-4 rounded shrink-0" />
        </CardContent>
      </Card>
    ))}
    <Card className="border-border/60">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-40 w-full rounded-xl" />
      </CardContent>
    </Card>
  </div>
);

/** Notificações: lista de avisos. */
export const NotificationsBodySkeleton = () => (
  <div className="max-w-2xl mx-auto space-y-3" aria-busy="true" aria-label="Carregando">
    {Array.from({ length: 4 }).map((_, i) => (
      <Card key={i} className="border-border/60">
        <CardContent className="p-4 flex gap-4">
          <Skeleton className="w-10 h-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

/** Questionários: os dois cartões (GAD-7 e PHQ-9). */
export const QuestionnairesBodySkeleton = () => (
  <div className="space-y-4">
    <IconCardSkeleton withButton />
    <IconCardSkeleton withButton />
  </div>
);

/** Benefício da empresa: cartão com título, texto, campo e botão. */
export const CompanyBenefitBodySkeleton = () => (
  <Card className="border-border/60">
    <CardContent className="p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-4 w-52" />
      </div>
      <IntroLinesSkeleton lines={2} />
      <div className="space-y-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
      <Skeleton className="h-10 w-full rounded-lg" />
    </CardContent>
  </Card>
);

/* ------------------------------------------------------------------ */
/* Psicólogo                                                           */
/* ------------------------------------------------------------------ */

/** Painel do psicólogo: cabeçalho roxo, 3 números, abas e lista. */
export const PsychologistDashboardSkeleton = () => (
  <div className="min-h-screen bg-background" aria-busy="true" aria-label="Carregando">
    <div className="bg-primary">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 md:py-4 flex items-center justify-between gap-3">
        <div className="space-y-2 min-w-0 flex-1">
          <Skeleton className="h-3 w-24 bg-white/25" />
          <Skeleton className="h-5 w-32 bg-white/25" />
        </div>
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <Skeleton className="h-7 w-12 rounded-full bg-white/25" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-white/20" />
          ))}
        </div>
      </div>
    </div>
    <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 md:py-6 space-y-4 sm:space-y-5">
      <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="border-border/60">
            <CardContent className="p-3 sm:p-5 flex items-start justify-between gap-2">
              <div className="space-y-2">
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-6 w-8" />
              </div>
              <Skeleton className="h-7 w-7 rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-9 flex-1 rounded-full" />
        ))}
      </div>
      <SkeletonSectionCard rows={3} accent="primary" />
    </div>
  </div>
);

/** Perfil do psicólogo: conta, perfil profissional, configurações e opções. */
export const PsychologistProfileBodySkeleton = () => (
  <>
    <FormCardSkeleton fields={2} />
    <FormCardSkeleton fields={3} />
    <Card className="border-border/60">
      <CardContent className="p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl border border-border/60 p-3">
            <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  </>
);

/** Minha Agenda: aviso, férias, os 7 dias e as regras. */
export const PsychologistAvailabilityBodySkeleton = () => (
  <>
    <Card className="border-border/60">
      <CardContent className="p-4">
        <IntroLinesSkeleton lines={4} />
      </CardContent>
    </Card>
    <Card className="border-border/60">
      <CardContent className="p-4 space-y-3">
        <Skeleton className="h-4 w-20" />
        <IntroLinesSkeleton lines={2} />
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1 rounded-lg" />
          <Skeleton className="h-10 flex-1 rounded-lg" />
        </div>
      </CardContent>
    </Card>
    <div className="space-y-2">
      {Array.from({ length: 7 }).map((_, i) => (
        <Card key={i} className="border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  </>
);

/** Meus pagamentos: a receber, recebido, detalhamento e Pix. */
export const PsychologistPaymentsBodySkeleton = () => (
  <>
    {Array.from({ length: 2 }).map((_, i) => (
      <Card key={i} className="border-border/60">
        <CardContent className="p-4 flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-3 w-36" />
          </div>
          <Skeleton className="h-10 w-10 rounded-lg" />
        </CardContent>
      </Card>
    ))}
    <Card className="border-border/60">
      <CardContent className="p-4 space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-3/4" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl border border-border/60 p-3">
            <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-5 w-6 rounded-full" />
          </div>
        ))}
      </CardContent>
    </Card>
    <Card className="border-border/60">
      <CardContent className="p-4 space-y-3">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </CardContent>
    </Card>
  </>
);

/* ------------------------------------------------------------------ */
/* Chamada de vídeo e admin                                            */
/* ------------------------------------------------------------------ */

/** Sala de vídeo (SOS e consulta) enquanto a chamada é preparada. */
export const CallSkeleton = () => (
  <div className="min-h-screen bg-background flex flex-col" aria-busy="true" aria-label="Preparando a chamada">
    <div className="bg-primary p-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full bg-white/25" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32 bg-white/25" />
          <Skeleton className="h-3 w-24 bg-white/25" />
        </div>
      </div>
      <Skeleton className="h-6 w-16 rounded-full bg-white/25" />
    </div>
    <div className="flex-1 p-4 flex flex-col gap-4">
      <Skeleton className="flex-1 min-h-[50vh] w-full rounded-2xl" />
      <div className="flex justify-center gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-12 rounded-full" />
        ))}
      </div>
    </div>
  </div>
);

/** Painel do admin: barra superior, números e seções. */
export const AdminDashboardSkeleton = () => (
  <div className="min-h-screen bg-background" aria-busy="true" aria-label="Carregando">
    <div className="border-b border-border bg-card px-4 h-14 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-4 w-28" />
      </div>
      <Skeleton className="h-5 w-5 rounded" />
    </div>
    <div className="max-w-7xl mx-auto p-4 space-y-4">
      <SkeletonStatsGrid count={6} />
      <SkeletonSectionCard rows={3} />
    </div>
  </div>
);

/** Formulário de página pública (login, cadastro, senha): só o fundo, sem conteúdo falso. */
export const PublicPageSkeleton = () => <div className="min-h-screen bg-background" aria-busy="true" aria-label="Carregando" />;

export { SkeletonList };
