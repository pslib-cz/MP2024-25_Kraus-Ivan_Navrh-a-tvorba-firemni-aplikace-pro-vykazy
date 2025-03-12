import React, { createContext, useContext, useState, useEffect, PropsWithChildren } from 'react';

interface NetworkContextProps {
  isOnline: boolean;
}

const NetworkContext = createContext<NetworkContextProps | undefined>(undefined);

export const NetworkProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline((prevStatus) => {
        const currentStatus = navigator.onLine;
        if (prevStatus !== currentStatus) {
          return currentStatus;
        }
        return prevStatus;
      });
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  return <NetworkContext.Provider value={{ isOnline }}>{children}</NetworkContext.Provider>;
};

export const useNetwork = (): NetworkContextProps => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};
