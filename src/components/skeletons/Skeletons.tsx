import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

/**
 * Standardized skeleton primitives used across the app so loading states
 * feel consistent and professional. All skeletons rely on the shared
 * `Skeleton` shadcn primitive (which uses `bg-muted` + `animate-pulse`).
 */

/** Header block for a card: circular icon + title + subtitle. */
export const SkeletonCardHeader = ({ accent = "muted" }: { accent?: "primary" | "secondary" | "muted" }) => {
  const bg =
    accent === "primary"
      ? "from-primary/5"
      : accent === "secondary"
      ? "from-secondary/5"
      : "from-muted/30";
  return (
    <CardHeader className={`bg-gradient-to-r ${bg} to-transparent`}>
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-56" />
        </div>
      </div>
    </CardHeader>
  );
};

/** List of rows (avatar + two text lines + trailing meta). */
export const SkeletonList = ({
  count = 4,
  showAvatar = true,
  showTrailing = true,
}: {
  count?: number;
  showAvatar?: boolean;
  showTrailing?: boolean;
}) => (
  <ul className="divide-y divide-border -mx-2">
    {Array.from({ length: count }).map((_, i) => (
      <li key={i} className="flex items-center justify-between gap-3 px-2 py-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {showAvatar && <Skeleton className="w-9 h-9 rounded-full shrink-0" />}
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
        {showTrailing && <Skeleton className="h-3 w-14 shrink-0" />}
      </li>
    ))}
  </ul>
);

/** Grid of stat tiles (icon + big number + label). */
export const SkeletonStatsGrid = ({
  count = 4,
  columns = "grid-cols-2 lg:grid-cols-4",
  compact = false,
}: {
  count?: number;
  columns?: string;
  compact?: boolean;
}) => (
  <div className={`grid ${columns} gap-2 sm:gap-3 md:gap-4`}>
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className={`rounded-lg border bg-card ${compact ? "p-3 sm:p-5" : "p-4"} space-y-2 sm:space-y-3`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-2 flex-1 min-w-0">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 sm:h-8 w-14 sm:w-20" />
            <Skeleton className="h-3 w-24 hidden sm:block" />
          </div>
          <Skeleton className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg shrink-0" />
        </div>
      </div>
    ))}
  </div>
);

/** Stacked card list skeleton (used for mobile lists of tabular data). */
export const SkeletonCardList = ({ count = 4 }: { count?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="rounded-lg border bg-card p-3 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <div className="text-right space-y-2 shrink-0">
            <Skeleton className="h-3 w-14 ml-auto" />
            <Skeleton className="h-4 w-20 ml-auto" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-5 w-28 rounded-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 flex-1 rounded-md" />
          <Skeleton className="h-9 flex-1 rounded-md" />
        </div>
      </div>
    ))}
  </div>
);

/** Card with header + body list. Drop-in replacement for a section spinner. */
export const SkeletonSectionCard = ({
  rows = 3,
  accent = "muted",
  showAvatar = true,
}: {
  rows?: number;
  accent?: "primary" | "secondary" | "muted";
  showAvatar?: boolean;
}) => (
  <Card
    className={
      accent === "primary"
        ? "border-l-4 border-l-primary"
        : accent === "secondary"
        ? "border-l-4 border-l-secondary"
        : "border-l-4 border-l-muted-foreground/30"
    }
  >
    <SkeletonCardHeader accent={accent} />
    <CardContent className="pt-6">
      <SkeletonList count={rows} showAvatar={showAvatar} />
    </CardContent>
  </Card>
);

/** Grid of cards (used for achievements, features, etc). */
export const SkeletonCardGrid = ({
  count = 6,
  columns = "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
}: {
  count?: number;
  columns?: string;
}) => (
  <div className={`grid ${columns} gap-4`}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="rounded-xl border bg-card p-5 space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="w-12 h-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
    ))}
  </div>
);

/** Chat messages skeleton (alternating bubbles). */
export const SkeletonChatMessages = ({ count = 6 }: { count?: number }) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, i) => {
      const mine = i % 2 === 1;
      return (
        <div key={i} className={`flex ${mine ? "justify-end" : "justify-start"} gap-2`}>
          {!mine && <Skeleton className="w-7 h-7 rounded-full shrink-0 mt-auto" />}
          <div className="space-y-2 max-w-[70%]">
            <Skeleton className={`h-10 ${i % 3 === 0 ? "w-64" : "w-40"} rounded-2xl`} />
          </div>
        </div>
      );
    })}
  </div>
);

/** Table skeleton (header + rows). */
export const SkeletonTable = ({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) => (
  <div className="w-full space-y-3">
    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className="h-4" />
      ))}
    </div>
    <div className="divide-y divide-border border rounded-lg">
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="grid gap-3 p-3"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: cols }).map((__, c) => (
            <Skeleton key={c} className="h-4" />
          ))}
        </div>
      ))}
    </div>
  </div>
);

/** Centered full-page skeleton for auth/permission checks. */
export const SkeletonFullPage = () => (
  <div className="min-h-screen bg-background p-4">
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-56" />
          <Skeleton className="h-3 w-40" />
        </div>
      </div>
      <SkeletonStatsGrid count={4} />
      <SkeletonSectionCard rows={4} accent="primary" />
      <SkeletonSectionCard rows={3} accent="secondary" />
    </div>
  </div>
);

/** Dashboard header skeleton (sticky header block). */
export const SkeletonDashboardHeader = () => (
  <div className="sticky top-0 z-30 bg-card/80 backdrop-blur border-b border-border">
    <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 px-4 py-4">
      <div className="space-y-2">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="h-10 w-10 rounded-full" />
    </div>
  </div>
);
