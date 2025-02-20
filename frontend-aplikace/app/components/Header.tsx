import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import styles from './Header.module.scss';
import { useScreenSize } from '@/providers/ScreenSizeProvider';
import logo from '../assets/images/sm-logo.png';
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import Button from './Button';

interface HeaderProps {
  icon: IconDefinition;
  title: string;
  backButton?: {
    link: string;
    showOn?: 'desktop' | 'mobile' | 'both';
  };
}

const Header: React.FC<HeaderProps> = ({ icon, title, backButton }) => {
  const navigate = useNavigate();
  const { isMobile } = useScreenSize();

  const shouldShowBackButton = () => {
    if (!backButton) return false;
    if (backButton.showOn === 'both') return true;
    if (backButton.showOn === 'mobile' && isMobile) return true;
    return backButton.showOn === 'desktop' && !isMobile;
  };

  return (
    <header className={styles.header}>
      <div className={styles.heading}>
        {shouldShowBackButton() && (
          <Button className={styles.backButton} onClick={() => navigate(backButton!.link)}>
            <FontAwesomeIcon icon={faChevronLeft} />
          </Button>
        )}
        <div className={styles.titleContainer}>
          <FontAwesomeIcon icon={icon} className={styles.icon} />
          <h1 className={styles.title}>{title}</h1>
        </div>
      </div>
      <div className={styles.smLogo}>
        <img src={logo} alt="Výkazovník logo" />
      </div>
    </header>
  );
};

export default Header;
