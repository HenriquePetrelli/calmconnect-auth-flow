import React from 'react';

interface BackgroundWrapperProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Theme-driven background. No hardcoded images — uses semantic tokens
 * so it adapts perfectly to light/dark mode.
 */
const BackgroundWrapper: React.FC<BackgroundWrapperProps> = ({ children, className = "" }) => {
  return (
    <div
      className={`relative min-h-screen bg-background text-foreground ${className}`}
    >
      {/* Subtle brand glow (orange + purple) */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.35] dark:opacity-25"
        style={{
          backgroundImage:
            'radial-gradient(60% 50% at 15% 0%, hsl(var(--primary) / 0.18), transparent 60%), radial-gradient(50% 40% at 85% 100%, hsl(var(--secondary) / 0.18), transparent 60%)',
        }}
      />
      {children}
    </div>
  );
};

export default BackgroundWrapper;
