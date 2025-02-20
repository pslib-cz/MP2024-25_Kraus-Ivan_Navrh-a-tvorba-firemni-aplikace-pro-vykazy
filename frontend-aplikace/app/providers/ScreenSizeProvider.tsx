import React, { createContext, useContext, useState, useEffect } from 'react';

interface ScreenSizeContextType {
  isMobile: boolean;
}

const ScreenSizeContext = createContext<ScreenSizeContextType | undefined>(undefined);

export const ScreenSizeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return <ScreenSizeContext.Provider value={{ isMobile }}>{children}</ScreenSizeContext.Provider>;
};

export const useScreenSize = (): ScreenSizeContextType => {
  const context = useContext(ScreenSizeContext);

  if (!context) {
    throw new Error('useScreenSize must be used within a ScreenSizeProvider');
  }

  return context;
};
