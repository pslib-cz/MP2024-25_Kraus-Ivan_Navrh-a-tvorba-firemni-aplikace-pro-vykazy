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
  const { isOpen, toggleMenu } = useMenuContext();
  const [isLoading, setIsLoading] = useState(false);
  const { logout, user } = useAuthContext();
  const navigate = useNavigate();
  const { isMobile } = useScreenSize();

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
      {!isMobile && (
        <div className={styles.toggle} onClick={toggleMenu}>
          <FontAwesomeIcon icon={isOpen ? faChevronLeft : faChevronRight} />
        </div>
      )}

      {isLoading && <Loader />}

      <span className={styles.divider} />

      <ul className={styles.menuList}>
        {menuItems.map(({ path, icon, label }) => (
          <li
            key={path}
            className={isActive(path) ? styles.active : ''}
            onClick={() => navigate(path)}
          >
            <FontAwesomeIcon icon={icon} />
            {!isMobile && <span>{label}</span>}
          </li>
        ))}
      </ul>

      <span className={styles.divider} />

      <div className={styles.footer}>
        {footerItems.map((item) => (
          <button
            key={item.path}
            className={`${styles.footerItem} ${isActive(item.path) ? styles.active : ''}`}
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