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

/** Cartão de abertura com ícone, título, texto e campo de busca (Respiração, Sons). */
const SearchHeroSkeleton = () => (
  <Card className="border-border/60">
    <CardContent className="p-4 space-y-4">
      <div className="flex items-start gap-3">
        <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
      <Skeleton className="h-10 w-full rounded-lg" />
    </CardContent>
  </Card>
);

/** Título de seção com subtítulo (ex.: "Técnicas de respiração"). */
const SectionTitleSkeleton = ({ trailing = false }: { trailing?: boolean }) => (
  <div className="flex items-end justify-between gap-4">
    <div className="space-y-1.5">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-3 w-48" />
    </div>
    {trailing && <Skeleton className="h-3 w-16" />}
  </div>
);

/** Respiração guiada: abertura com busca, filtros e cartões de técnica. */
export const BreathingBodySkeleton = () => (
  <>
    <SearchHeroSkeleton />
    <div className="flex flex-wrap gap-2">
      {[14, 16, 20, 24].map((w, i) => (
        <Skeleton key={i} className="h-8 rounded-full" style={{ width: `${w * 4}px` }} />
      ))}
    </div>
    <SectionTitleSkeleton trailing />
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="border-border/60">
          <CardContent className="flex items-start gap-3 p-4">
            <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-4 w-28 rounded-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </>
);

/** Sons terapêuticos: abertura com busca e cartões grandes de categoria. */
export const SoundsBodySkeleton = () => (
  <>
    <SearchHeroSkeleton />
    <SectionTitleSkeleton />
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="border-border/60">
          <CardContent className="space-y-3 p-5">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-3 w-12" />
          </CardContent>
        </Card>
      ))}
    </div>
  </>
);

/** Comer com atenção: um cartão centralizado com ícone, texto e botão. */
export const MindfulEatingBodySkeleton = () => (
  <Card className="border-border/60">
    <CardContent className="flex flex-col items-center gap-3 p-6">
      <Skeleton className="h-8 w-8 rounded-full" />
      <Skeleton className="h-5 w-48" />
      <div className="w-full space-y-2">
        <Skeleton className="mx-auto h-3 w-full" />
        <Skeleton className="mx-auto h-3 w-5/6" />
        <Skeleton className="mx-auto h-3 w-2/3" />
      </div>
      <Skeleton className="h-10 w-full rounded-lg" />
    </CardContent>
  </Card>
);

/** Adicionar hábito: grupos com título e cartões de tipo de hábito. */
export const HabitCatalogSkeleton = () => (
  <>
    {[4, 2].map((rows, g) => (
      <section key={g} className="space-y-2">
        <Skeleton className="h-3 w-24" />
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
            <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-full" />
            </div>
            <Skeleton className="h-4 w-4 rounded shrink-0" />
          </div>
        ))}
      </section>
    ))}
  </>
);

/** Formulário de um hábito: cartão do tipo, campos, lembretes e botão. */
export const HabitFormSkeleton = () => (
  <>
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
      <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-full" />
      </div>
    </div>
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    ))}
    <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-11 rounded-full" />
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-10 w-full rounded-lg" />
    </div>
    <Skeleton className="h-11 w-full rounded-lg" />
  </>
);

/** Detalhe de um hábito: anel do dia com registros rápidos, histórico e lembrete. */
export const HabitDetailSkeleton = () => (
  <>
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-5">
      <Skeleton className="h-36 w-36 rounded-full" />
      <Skeleton className="h-4 w-40" />
      <div className="grid w-full grid-cols-3 gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-11 rounded-xl" />
        ))}
      </div>
    </div>
    <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <Skeleton className="h-4 w-32" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between">
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
    <Skeleton className="h-12 w-full rounded-xl" />
  </>
);

/** Portal da empresa: empresa e vagas, convite, uso do mês e desligamento. */
export const CompanyPortalBodySkeleton = () => (
  <>
    {[3, 3, 3, 2].map((lines, i) => (
      <div key={i} className="space-y-3 rounded-2xl border border-border bg-card p-5">
        <Skeleton className="h-5 w-40" />
        {Array.from({ length: lines }).map((_, j) => (
          <Skeleton key={j} className={j === lines - 1 ? "h-10 w-full rounded-lg" : "h-3 w-3/4"} />
        ))}
      </div>
    ))}
  </>
);

/** Editor do plano de segurança: texto de abertura, partes do plano e CVV. */
export const SafetyPlanEditorSkeleton = () => (
  <>
    <div className="space-y-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
    </div>
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
    <Skeleton className="h-20 w-full rounded-xl" />
  </>
);

/** Plano de segurança aberto para leitura. */
export const SafetyPlanViewSkeleton = () => (
  <div className="space-y-4">
    <Skeleton className="h-24 w-full rounded-2xl" />
    <Skeleton className="h-40 w-full rounded-2xl" />
  </div>
);

/** Grupo de apoio: botão de sintomas, filtro e depoimentos. */
export const SupportGroupDetailSkeleton = () => (
  <>
    <Skeleton className="mx-auto h-8 w-32 rounded-lg" />
    <Skeleton className="h-10 w-full rounded-lg" />
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="border-border/60">
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      ))}
    </div>
  </>
);

/** Volta do checkout: cartão centralizado com ícone, título, lista e botão. */
export const SubscriptionResultSkeleton = () => (
  <div className="flex min-h-screen items-center justify-center bg-background p-4" aria-busy="true" aria-label="Carregando">
    <Card className="w-full max-w-md border-border/60">
      <CardContent className="flex flex-col items-center gap-3 p-6">
        <Skeleton className="h-12 w-12 rounded-full" />
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-3 w-56" />
        <div className="w-full space-y-2 rounded-lg bg-muted/40 p-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-4/6" />
        </div>
        <Skeleton className="h-10 w-full rounded-lg" />
      </CardContent>
    </Card>
  </div>
);

/** Categoria ou playlist de sons: descrição, total com "Reproduzir todos" e a lista. */
export const SoundListSkeleton = ({ withDescription = true }: { withDescription?: boolean }) => (
  <>
    {withDescription && <IntroLinesSkeleton lines={2} />}
    <div className="flex items-center justify-between">
      <div className="space-y-1.5">
        <Skeleton className="h-5 w-8" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-9 w-40 rounded-full" />
    </div>
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="border-border/60">
          <CardContent className="flex items-center gap-3 p-3">
            <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-40" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </>
);

/** Player de som: visual redondo, nome, barra de tempo, play e ambientes. */
export const SoundPlayerSkeleton = () => (
  <div className="flex flex-col items-center gap-4">
    <Skeleton className="aspect-square w-full max-w-[280px] rounded-full" />
    <Skeleton className="h-5 w-32" />
    <Skeleton className="h-3 w-24" />
    <Skeleton className="h-2 w-full rounded-full" />
    <Skeleton className="h-12 w-12 rounded-full" />
    <div className="grid w-full grid-cols-2 gap-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-8 rounded-lg" />
      ))}
    </div>
    <Skeleton className="h-9 w-full rounded-lg" />
  </div>
);

/** Fim de um som: cartão centralizado com ícone, pergunta e dois botões. */
export const SoundFeedbackSkeleton = () => (
  <div className="flex min-h-screen items-center justify-center bg-background p-6 pb-24" aria-busy="true" aria-label="Carregando">
    <Card className="w-full max-w-md border-border/60">
      <CardContent className="flex flex-col items-center gap-3 p-6">
        <Skeleton className="h-14 w-14 rounded-full" />
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-3 w-48" />
        <Skeleton className="mt-2 h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </CardContent>
    </Card>
  </div>
);

/** Meu Diário: cartão de filtros por humor e as anotações. */
export const JournalBodySkeleton = () => (
  <>
    <Card className="border-border/60">
      <CardContent className="space-y-3 p-3">
        <Skeleton className="h-9 w-full rounded-lg" />
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-10 rounded-lg" />
          ))}
        </div>
      </CardContent>
    </Card>
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="space-y-3">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-4 w-1/4" />
      </div>
    ))}
  </>
);

/** Suporte: formulário e o cartão "Informações importantes". */
export const SupportBodySkeleton = () => (
  <>
    <FormCardSkeleton fields={3} />
    <Card className="border-border/60">
      <CardContent className="space-y-2 p-4">
        <Skeleton className="h-4 w-44" />
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-3 w-4/5" />
      </CardContent>
    </Card>
  </>
);

/** Questionário (GAD-7/PHQ-9): introdução e perguntas com 4 opções. */
export const QuestionnaireFormSkeleton = () => (
  <>
    <IntroLinesSkeleton lines={3} />
    <Skeleton className="h-4 w-3/4" />
    {Array.from({ length: 3 }).map((_, i) => (
      <Card key={i} className="border-border/60">
        <CardContent className="space-y-3 p-4">
          <Skeleton className="h-4 w-4/5" />
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 4 }).map((_, j) => (
              <Skeleton key={j} className="h-10 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    ))}
  </>
);

/** Planos de assinatura: título, plano atual e os cartões de plano com preço. */
export const SubscriptionPlansBodySkeleton = () => (
  <>
    <div className="flex flex-col items-center gap-2">
      <Skeleton className="h-6 w-44" />
      <Skeleton className="h-3 w-64" />
      <Skeleton className="h-3 w-48" />
    </div>
    <Card className="border-border/60">
      <CardContent className="flex flex-col items-center gap-3 p-5">
        <Skeleton className="h-9 w-44 rounded-lg" />
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-9 w-full rounded-lg" />
      </CardContent>
    </Card>
    {Array.from({ length: 2 }).map((_, i) => (
      <Card key={i} className="border-border/60">
        <CardContent className="flex flex-col items-center gap-3 p-5">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-7 w-36" />
          <div className="w-full space-y-2 pt-1">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded-full shrink-0" />
                <Skeleton className="h-3 w-3/5" />
              </div>
            ))}
          </div>
          <Skeleton className="h-10 w-full rounded-lg" />
        </CardContent>
      </Card>
    ))}
  </>
);

/** Grupos de apoio: frase de abertura e cartões de grupo. */
export const SupportGroupsBodySkeleton = () => (
  <div className="space-y-6">
    <Skeleton className="mx-auto h-4 w-3/4" />
    <div className="space-y-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="border-border/60">
          <CardContent className="space-y-3 p-6">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

/** Perfil do paciente: identidade, Meu plano e as seções de opções. */
const ProfileRowsSkeleton = ({ rows }: { rows: number }) => (
  <div className="space-y-2">
    <Skeleton className="ml-1 h-3 w-24" />
    <Card className="overflow-hidden border-border/60 divide-y divide-border/60">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex min-h-[68px] items-center gap-4 px-4 py-3">
          <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
          <div className="space-y-2 min-w-0 flex-1">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-44" />
          </div>
          <Skeleton className="h-4 w-4 rounded shrink-0" />
        </div>
      ))}
    </Card>
  </div>
);

export const ProfileSkeleton = () => (
  <div className="mx-auto w-full max-w-3xl space-y-6 pb-4" aria-busy="true" aria-label="Carregando">
    <Card className="border-border/60">
      <div className="flex items-center gap-4 p-5">
        <Skeleton className="w-16 h-16 rounded-2xl shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-5 w-28 rounded-full" />
        </div>
      </div>
    </Card>

    {/* Meu plano: cabeçalho, benefícios e botão. */}
    <div className="space-y-2">
      <Skeleton className="ml-1 h-3 w-20" />
      <Card className="border-border/60">
        <div className="space-y-4 p-4">
          <div className="flex items-center gap-4">
            <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-52" />
            ))}
          </div>
          <Skeleton className="h-11 w-full rounded-md" />
        </div>
      </Card>
    </div>

    <ProfileRowsSkeleton rows={2} />
    <ProfileRowsSkeleton rows={4} />
    <ProfileRowsSkeleton rows={3} />
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
/** Título das telas do psicólogo (dentro do layout), com ação opcional à direita. */
const PsychologistTitleSkeleton = ({ action = false }: { action?: boolean }) => (
  <div className="flex items-start justify-between gap-3">
    <div className="space-y-2">
      <Skeleton className="h-7 w-44" />
      <Skeleton className="h-4 w-56" />
    </div>
    {action && <Skeleton className="h-10 w-28 rounded-md" />}
  </div>
);

/** Início do psicólogo: saudação, status do SOS e resumo das consultas. */
export const PsychologistDashboardSkeleton = () => (
  <div className="space-y-5 md:space-y-6" aria-busy="true" aria-label="Carregando">
    <PsychologistTitleSkeleton />
    <Card className="border-border/60">
      <CardContent className="flex items-center gap-4 p-4 sm:p-5">
        <Skeleton className="h-12 w-12 shrink-0 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-52" />
          <Skeleton className="h-3 w-64" />
        </div>
        <Skeleton className="h-6 w-11 rounded-full" />
      </CardContent>
    </Card>
    <div className="space-y-2">
      <Skeleton className="ml-1 h-3 w-20" />
      <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="border-border/60">
            <CardContent className="flex items-start justify-between gap-2 p-3 sm:p-5">
              <div className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-7 w-8" />
              </div>
              <Skeleton className="hidden h-10 w-10 rounded-xl sm:block" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  </div>
);

/** Consultas do psicólogo: título, abas e a lista. */
export const PsychologistConsultationsSkeleton = () => (
  <div className="space-y-5" aria-busy="true" aria-label="Carregando">
    <PsychologistTitleSkeleton />
    <Skeleton className="h-11 w-full rounded-lg" />
    <SkeletonSectionCard rows={3} accent="primary" />
  </div>
);

/** Perfil do psicólogo: identidade, perfil profissional e as seções de opções. */
export const PsychologistProfileBodySkeleton = () => (
  <div className="mx-auto w-full max-w-3xl space-y-6" aria-busy="true" aria-label="Carregando">
    <Card className="border-border/60">
      <div className="flex items-center gap-4 p-5">
        <Skeleton className="h-16 w-16 shrink-0 rounded-2xl" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-5 w-32 rounded-full" />
        </div>
      </div>
    </Card>
    <div className="space-y-2">
      <Skeleton className="ml-1 h-3 w-32" />
      <FormCardSkeleton fields={3} title={false} />
    </div>
    <ProfileRowsSkeleton rows={2} />
    <ProfileRowsSkeleton rows={2} />
    <ProfileRowsSkeleton rows={2} />
    <ProfileRowsSkeleton rows={3} />
  </div>
);

/** Agenda com o título da tela (o corpo está logo abaixo). */
export const PsychologistAvailabilitySkeleton = () => (
  <div className="max-w-3xl space-y-4" aria-busy="true" aria-label="Carregando">
    <PsychologistTitleSkeleton action />
    <PsychologistAvailabilityBodySkeleton />
  </div>
);

/** Pagamentos com o título da tela. */
export const PsychologistPaymentsSkeleton = () => (
  <div className="w-full space-y-6" aria-busy="true" aria-label="Carregando">
    <PsychologistTitleSkeleton action />
    <PsychologistPaymentsBodySkeleton />
  </div>
);

/** Notificações do psicólogo com o título da tela. */
export const PsychologistNotificationsSkeleton = () => (
  <div className="space-y-4" aria-busy="true" aria-label="Carregando">
    <PsychologistTitleSkeleton />
    <NotificationsBodySkeleton />
  </div>
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
