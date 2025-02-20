import React, { createContext, useState, useContext } from 'react';

export interface MenuContextType {
  isOpen: boolean;
  toggleMenu: () => void;
  setMenuState: (isOpen: boolean) => void;
}

const MenuContext = createContext<MenuContextType | undefined>(undefined);

export const MenuProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen((prev) => !prev);
  };

  const setMenuState = (state: boolean) => {
    setIsOpen(state);
  };

  return (
    <MenuContext.Provider value={{ isOpen, toggleMenu, setMenuState }}>
      {children}
    </MenuContext.Provider>
  );
};

export const useMenuContext = (): MenuContextType => {
  const context = useContext(MenuContext);
  if (!context) {
    throw new Error('useMenuContext must be used within a MenuProvider');
  }
  return context;
};
