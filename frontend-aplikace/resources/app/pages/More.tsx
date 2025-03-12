import Menu from '../components/Menu';
import styles from './More.module.scss';
import Header from '@/components/Header';
import {
  faCompass,
  faFileAlt,
  faFolderOpen,
  faRightFromBracket,
  faUsers,
  faUserShield,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/providers/AuthProvider';
import profile_picture_placeholder from '@/assets/images/profile_picture_placeholder.webp';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Button from '@/components/Button';
import RoleInfo from '@/components/RoleInfo';
import JobTitle from '@/components/JobTitle';
import React from 'react';

const More: React.FC = () => {
  // Funkce z AuthProvideru
  const { user, logout } = useAuthContext();
  const navigate = useNavigate();

  // Kontrola, zda je uživatel admin nebo manažer
  const isAdminOrSupervisor = user?.role.id === 1 || user?.role.id === 2;

  // Zobrazení profilovky
  const profilePicture = user?.avatar
    ? `data:image/jpeg;base64,${user.avatar}`
    : profile_picture_placeholder;

  return (
    <div className={styles.layoutContainer}>
      <Menu activeItem="/more" />

      <div className={styles.contentContainer}>
        <Header icon={faCompass} title="Více" />

        <div className={styles.content}>
          <div className={styles.profileSection}>
            <div className={styles.profileImage}>
              <img src={profilePicture} alt="Profilový obrázek" />
            </div>
            <div className={styles.profileDetails}>
              <div className={styles.name}>
                <JobTitle
                  id={user?.job_title?.id || 1}
                  returnType="icon"
                  className="custom-icon-class"
                />
                <h2>{user?.name || 'Neznámý uživatel'}</h2>
              </div>
              <div className={styles.role}>
                <RoleInfo id={user?.role?.id || 1} displayType="both" />
              </div>
              {user?.supervisor?.name && (
                <div className={styles.superVisor}>
                  <FontAwesomeIcon icon={faUserShield} />
                  {user.supervisor?.name}
                </div>
              )}
            </div>
          </div>

          <div className={styles.buttonsContainer}>
            <Button className={styles.actionButton} onClick={() => navigate('/my-profile')}>
              <FontAwesomeIcon icon={faUser} />
              <span>Můj profil</span>
            </Button>

            <Button className={styles.actionButton} onClick={() => navigate('/my-reports')}>
              <FontAwesomeIcon icon={faFileAlt} />
              <span>Moje výkazy</span>
            </Button>

            {isAdminOrSupervisor && (
              <Button className={styles.actionButton} onClick={() => navigate('/all-reports')}>
                <FontAwesomeIcon icon={faFolderOpen} />
                {user?.role.id === 1 ? <span>Všechny výkazy</span> : <span>Výkazy mého týmu</span>}
              </Button>
            )}

            {isAdminOrSupervisor && (
              <Button className={styles.actionButton} onClick={() => navigate('/all-users')}>
                <FontAwesomeIcon icon={faUsers} />
                {user?.role.id === 1 ? <span>Všichni uživatelé</span> : <span>Můj tým</span>}
              </Button>
            )}

            <Button className={styles.logoutButton} onClick={logout}>
              <FontAwesomeIcon icon={faRightFromBracket} />
              <span>Odhlásit se</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default More;
