import { ReactNode, useEffect, useRef, useState } from "react";

/**
 * Crossfades between a skeleton and the real content.
 *
 * While `loading` is true the skeleton is shown. When loading finishes, the
 * skeleton fades/slides out and the content fades/slides in — avoiding the
 * abrupt "pop" that is especially noticeable on mobile.
 */
export const ContentTransition = ({
  loading,
  skeleton,
  children,
  className = "",
  duration = 260,
}: {
  loading: boolean;
  skeleton: ReactNode;
  children: ReactNode;
  className?: string;
  duration?: number;
}) => {
  // Keeps the skeleton mounted for one fade-out cycle after loading ends.
  const [showSkeleton, setShowSkeleton] = useState(loading);
  const [fadingOut, setFadingOut] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (loading) {
      clearTimeout(timer.current);
      setShowSkeleton(true);
      setFadingOut(false);
      return;
    }
    if (!showSkeleton) return;
    setFadingOut(true);
    timer.current = setTimeout(() => {
      setShowSkeleton(false);
      setFadingOut(false);
    }, duration);
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  useEffect(() => () => clearTimeout(timer.current), []);

  if (showSkeleton) {
    return (
      <div
        className={`transition-all ease-out ${
          fadingOut ? "opacity-0 -translate-y-1" : "opacity-100 translate-y-0"
        } ${className}`}
        style={{ transitionDuration: `${duration}ms` }}
        aria-busy="true"
      >
        {skeleton}
      </div>
    );
  }

  return (
    <div key="content" className={`animate-fade-in ${className}`}>
      {children}
    </div>
  );
};

export default ContentTransition;
