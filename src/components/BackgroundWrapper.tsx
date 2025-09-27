import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

// Import background images
import mobileLight from '@/assets/backgrounds/mobile_light.png';
import tabletLight from '@/assets/backgrounds/tablet_light.png';
import desktopLight from '@/assets/backgrounds/desktop_light.png';
import mobileDark from '@/assets/backgrounds/mobile_dark.jpg';
import tabletDark from '@/assets/backgrounds/tablet_dark.jpg';
import desktopDark from '@/assets/backgrounds/desktop_dark.jpg';

interface BackgroundWrapperProps {
  children: React.ReactNode;
  className?: string;
}

const BackgroundWrapper: React.FC<BackgroundWrapperProps> = ({ children, className = "" }) => {
  const isMobile = useIsMobile();
  
  // Determine which background image to use based on screen size and theme
  const getBackgroundImage = () => {
    const isDark = document.documentElement.classList.contains('dark');
    
    if (window.innerWidth <= 767) {
      return isDark ? mobileDark : mobileLight;
    } else if (window.innerWidth <= 1023) {
      return isDark ? tabletDark : tabletLight;
    } else {
      return isDark ? desktopDark : desktopLight;
    }
  };

  const backgroundStyle = {
    backgroundImage: `url(${getBackgroundImage()})`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: 'cover',
    backgroundPosition: 'bottom center',
    backgroundAttachment: 'fixed',
    minHeight: '100vh'
  };

  return (
    <div 
      className={`relative ${className}`} 
      style={backgroundStyle}
    >
      {children}
    </div>
  );
};

export default BackgroundWrapper;