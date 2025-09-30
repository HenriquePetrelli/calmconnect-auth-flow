import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const ProfileSkeleton = () => {
  return (
    <div className="has-tabs">
      <div className="screen">
        {/* Header */}
        <div className="flex items-center gap-4 p-4 border-b border-border">
          <Skeleton className="h-10 w-10 rounded-md" />
          <Skeleton className="h-6 w-24" />
        </div>

        {/* Content */}
        <main className="p-4 space-y-6">
          {/* User Info Card */}
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6">
              <div className="flex items-center gap-6">
                <Skeleton className="w-20 h-20 rounded-full" />
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-5 w-64" />
                  <Skeleton className="h-5 w-24" />
                </div>
              </div>
            </div>
          </Card>

          {/* Current Plan Card */}
          <Card className="border-2 border-primary/20">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 pb-4">
              <div className="flex items-center gap-3">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-48" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="flex items-start justify-between">
                <div className="space-y-3 flex-1">
                  <Skeleton className="h-6 w-32" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-4/5" />
                  </div>
                </div>
                <div className="bg-primary/5 p-4 rounded-lg space-y-2">
                  <Skeleton className="h-9 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
              
              <div className="border-t pt-4">
                <Skeleton className="h-12 w-full rounded-md" />
              </div>
            </CardContent>
          </Card>

          {/* Settings Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Skeleton className="w-5 h-5" />
                <Skeleton className="h-5 w-32" />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-56" />
                </div>
                <Skeleton className="h-9 w-16 rounded-full" />
              </div>
              
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-56" />
                </div>
                <Skeleton className="h-9 w-16 rounded-full" />
              </div>
            </CardContent>
          </Card>

          {/* Account Actions Card */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-12 w-full rounded-md" />
              <Skeleton className="h-12 w-full rounded-md" />
              <div className="pt-2 border-t">
                <Skeleton className="h-12 w-full rounded-md" />
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default ProfileSkeleton;
