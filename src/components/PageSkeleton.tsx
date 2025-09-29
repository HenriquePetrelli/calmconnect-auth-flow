import React from 'react';

interface PageSkeletonProps {
  type?: 'home' | 'chat' | 'profile' | 'appointments';
}

const PageSkeleton: React.FC<PageSkeletonProps> = ({ type = 'home' }) => {
  if (type === 'home') {
    return (
      <div className="px-4 lg:p-6">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Mobile/Tablet Mood Section Skeleton */}
          <div className="lg:hidden space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-7 w-48 bg-muted/60 rounded animate-pulse"></div>
                <div className="h-4 w-64 bg-muted/40 rounded animate-pulse"></div>
              </div>
            </div>
            <div className="w-full h-16 bg-card/80 border border-muted/50 rounded-xl animate-pulse"></div>
          </div>

          {/* Resources Section Skeleton */}
          <div className="space-y-4">
            <div className="h-6 w-32 bg-muted/60 rounded animate-pulse"></div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-card/80 border border-muted/50 rounded-xl p-4 space-y-3 animate-pulse">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg mx-auto"></div>
                  <div className="h-4 w-3/4 bg-muted/60 rounded mx-auto"></div>
                  <div className="h-3 w-full bg-muted/40 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'chat') {
    return (
      <div className="px-4 lg:p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="h-8 w-32 bg-muted/60 rounded animate-pulse"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-card/80 border border-muted/50 rounded-xl p-4 space-y-2 animate-pulse">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 bg-muted/60 rounded"></div>
                    <div className="h-3 w-1/2 bg-muted/40 rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (type === 'profile') {
    return (
      <div className="px-4 lg:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Profile Header Skeleton */}
          <div className="bg-card/80 border border-muted/50 rounded-xl p-6 space-y-4 animate-pulse">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-6 w-48 bg-muted/60 rounded"></div>
                <div className="h-4 w-32 bg-muted/40 rounded"></div>
              </div>
            </div>
          </div>

          {/* Settings Skeleton */}
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-card/80 border border-muted/50 rounded-xl p-4 space-y-2 animate-pulse">
                <div className="h-5 w-40 bg-muted/60 rounded"></div>
                <div className="h-4 w-3/4 bg-muted/40 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (type === 'appointments') {
    return (
      <div className="px-4 lg:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header Skeleton */}
          <div className="h-8 w-48 bg-muted/60 rounded animate-pulse"></div>
          
          {/* Appointments List Skeleton */}
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-card/80 border border-muted/50 rounded-xl p-6 space-y-4 animate-pulse">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="h-5 w-40 bg-muted/60 rounded"></div>
                    <div className="h-4 w-32 bg-muted/40 rounded"></div>
                  </div>
                  <div className="h-8 w-20 bg-primary/10 rounded"></div>
                </div>
                <div className="h-4 w-3/4 bg-muted/40 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Default skeleton
  return (
    <div className="px-4 lg:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="h-8 w-48 bg-muted/60 rounded animate-pulse"></div>
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card/80 border border-muted/50 rounded-xl p-6 space-y-4 animate-pulse">
              <div className="h-6 w-3/4 bg-muted/60 rounded"></div>
              <div className="h-4 w-full bg-muted/40 rounded"></div>
              <div className="h-4 w-2/3 bg-muted/40 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PageSkeleton;