import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

const ProfileSkeleton = () => {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      {/* Hero identity card */}
      <Card className="overflow-hidden border-border/60">
        <div className="p-6 sm:p-7">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <Skeleton className="w-20 h-20 rounded-2xl" />
            <div className="flex-1 min-w-0 space-y-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-5 w-28 rounded-full" />
            </div>
            <div className="hidden sm:block">
              <Skeleton className="h-9 w-32 rounded-md" />
            </div>
          </div>
        </div>
      </Card>

      {/* Collapsible rows (plan + settings + account actions) */}
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="overflow-hidden border-border/60">
          <div className="flex items-center justify-between p-5">
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <Skeleton className="w-11 h-11 rounded-xl shrink-0" />
              <div className="space-y-2 min-w-0 flex-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-52" />
              </div>
            </div>
            <Skeleton className="h-5 w-5 rounded shrink-0" />
          </div>
        </Card>
      ))}
    </div>
  );
};

export default ProfileSkeleton;
