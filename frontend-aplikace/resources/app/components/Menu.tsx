import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import classNames from 'classnames';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faStopwatch,
  faComments,
  faFileAlt,
  faFolderOpen,
  faUsers,
  faSignOutAlt,
  faBars,
  faChevronLeft,
  faChevronRight,
  faCirclePlus,
  faUser,
} from '@fortawesome/free-solid-svg-icons';

import styles from './Menu.module.scss';
import { useAuthContext } from '@/providers/AuthProvider';
import { useScreenSize } from '@/providers/ScreenSizeProvider';
import { useMenuContext } from '@/providers/MenuProvider';
import Loader from './Loader';

import { useTimerContext } from '@/providers/TimerProvider';

interface MenuItem {
  path: string;
  icon: any;
  label: string;
  action?: () => void;
}

interface MenuProps {
  activeItem: string;
}

const Menu: React.FC<MenuProps> = ({ activeItem }) => {
  // Stav menu (otevřené/zavřené)
  const { isOpen, toggleMenu } = useMenuContext();

  // Loader
  const [isLoading, setIsLoading] = useState(false);

  // Informace o přihlášeném uživateli a funkce pro odhlášení
  const { logout, user } = useAuthContext();
  const navigate = useNavigate();

  // Typ zařízení
  const { isMobile } = useScreenSize();

  // Časovače – pulzování toggle tlačítka
  const { timers } = useTimerContext();
  const isAnyTimerRunning = timers.some((timer) => timer.isRunning);

  // Odhlášení uživatele
  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Chyba při odhlášení:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Definice položek menu na základě role a typu zařízení
  const getMenuItems = (): MenuItem[] => {
    let items: MenuItem[] = [
      { path: '/new-report', icon: faCirclePlus, label: 'Nový výkaz' },
      { path: '/toggle', icon: faStopwatch, label: 'Toggle' },
      { path: '/standup', icon: faComments, label: 'Standup' },
      { path: '/my-reports', icon: faFileAlt, label: 'Moje výkazy' },
    ];

    if (user?.role.id === 1 || user?.role.id === 2) {
      items.push({
        path: '/all-reports',
        icon: faFolderOpen,
        label: user.role.id === 2 ? 'Výkazy týmu' : 'Všechny výkazy',
      });
      items.push({
        path: '/all-users',
        icon: faUsers,
        label: user.role.id === 2 ? 'Můj tým' : 'Uživatelé',
      });
    }

    // Pro mobilní zařízení
    if (isMobile) {
      return [
        { path: '/new-report', icon: faCirclePlus, label: 'Nový výkaz' },
        { path: '/toggle', icon: faStopwatch, label: 'Toggle' },
        { path: '/standup', icon: faComments, label: 'Standup' },
        { path: '/more', icon: faBars, label: 'Více' },
      ];
    }

    return items;
  };

  // Položky ve footeru
  const footerItems: MenuItem[] = [
    {
      path: '/my-profile',
      icon: faUser,
      label: user?.name || 'Profil',
    },
    {
      path: '/logout',
      icon: faSignOutAlt,
      label: 'Odhlásit se',
      action: handleLogout,
    },
  ];

  // Určení aktivní položky menu
  const isActive = (path: string) => {
    if (
      path === '/all-users' &&
      (activeItem.startsWith('/edit-user') || activeItem.startsWith('/new-user'))
    ) {
      return true;
    }
    if (path === '/all-reports' && activeItem.startsWith('/edit-report')) {
      return true;
    }

    // Mobilní zařízení – hidden aktivní položky
    if (isMobile && path === '/more') {
      const hiddenMobilePaths = [
        '/my-reports',
        '/all-reports',
        '/all-users',
        '/my-profile',
        '/more',
      ];
      if (hiddenMobilePaths.some((hiddenPath) => activeItem.startsWith(hiddenPath))) {
        return true;
      }
    }
    return activeItem.startsWith(path);
  };

  // Zpracování akce položky footeru
  const handleFooterAction = (item: MenuItem) => {
    if (item.action) {
      setIsLoading(true);
      item.action();
    } else {
      navigate(item.path);
    }
  };

  const menuItems = getMenuItems();

  return (
    <nav
      className={classNames(styles.menu, {
        [styles.open]: isOpen && !isMobile,
      })}
    >
      {/* Button pro otevření/zavření menu (desktop) */}
      {!isMobile && (
        <div className={styles.toggle} onClick={toggleMenu}>
          <FontAwesomeIcon icon={isOpen ? faChevronLeft : faChevronRight} />
        </div>
      )}

      {/* Loader */}
      {isLoading && <Loader />}

      <span className={styles.divider} />

      {/* Hlavní seznam položek menu */}
      <ul className={styles.menuList}>
        {menuItems.map(({ path, icon, label }) => (
          <li
            key={path}
            title={label}
            className={classNames({
              [styles.active]: isActive(path),
              [styles.pulsing]: path === '/toggle' && isAnyTimerRunning,
            })}
            onClick={() => navigate(path)}
          >
            <FontAwesomeIcon icon={icon} />
            {!isMobile && <span>{label}</span>}
          </li>
        ))}
      </ul>

      <span className={styles.divider} />

      {/* Footer menu */}
      <div className={styles.footer}>
        {footerItems.map((item) => (
          <button
            key={item.path}
            title={item.label}
            className={classNames(styles.footerItem, {
              [styles.active]: isActive(item.path),
            })}
            onClick={() => handleFooterAction(item)}
          >
            <FontAwesomeIcon icon={item.icon} />
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default Menu;
