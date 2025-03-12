import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPen,
  faTrash,
  faChevronDown,
  faChevronUp,
  faUserShield,
  faQuestionCircle,
} from '@fortawesome/free-solid-svg-icons';
import styles from './UserCards.module.scss';
import JobTitle from '@/components/JobTitle';
import RoleInfo from '@/components/RoleInfo';
import { User } from '@/providers/UserProvider';
import Loader from './Loader';

// Interface pro UserCards
interface UserCardsProps {
  users: User[] | null;
  isLoading: boolean;
  handleDelete: (id: number, name: string) => void;
  onEdit: (id: number) => void;
}

const UserCards: React.FC<UserCardsProps> = ({ users, isLoading, handleDelete, onEdit }) => {
  // ID aktuálně rozbalené karty
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

  // Přepnutí stavu rozbalení karty
  const toggleCard = (id: number) => {
    setExpandedCard(expandedCard === id ? null : id);
  };

  // Loader
  if (isLoading) {
    return (
      <div className={styles.loaderContainer}>
        <Loader isContentOnly />
      </div>
    );
  }

  if (!users || users.length === 0) {
    return <div className={styles.noUsers}>Žádné výsledky nebyly nalezeny.</div>;
  }

  return (
    <div className={styles.cards}>
      {users.map((user) => (
        <div key={user.id} className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.topRow}>
              <div className={styles.contentContainer}>
                <h3>
                  <RoleInfo id={user.role.id} displayType="icon" />
                  {user.name}
                </h3>
                <div className={styles.icons}>
                  <JobTitle id={user.job_title?.id || null} returnType="icon" />
                </div>
              </div>
              <button className={styles.editButton} onClick={() => onEdit(user.id)}>
                <FontAwesomeIcon icon={faPen} />
              </button>
            </div>

            <div
              className={`${styles.middleRow} ${expandedCard === user.id ? styles.expanded : ''}`}
            >
              <div className={styles.content}>
                {user.supervisor && (
                  <div className={styles.infoRow}>
                    <FontAwesomeIcon icon={faUserShield} />
                    <span>{user.supervisor.name}</span>
                  </div>
                )}
                <div className={styles.infoRow}>
                  <FontAwesomeIcon icon={faQuestionCircle} />
                  <span>{user.auto_approved ? 'Nevyžaduje' : 'Vyžaduje'}</span>
                </div>
              </div>
              <button
                className={styles.deleteButton}
                onClick={() => handleDelete(user.id, user.name)}
              >
                <FontAwesomeIcon icon={faTrash} />
              </button>
            </div>

            <div className={styles.secondRow}>
              <span>{user.email}</span>
              <button className={styles.toggleButton} onClick={() => toggleCard(user.id)}>
                <FontAwesomeIcon icon={expandedCard === user.id ? faChevronUp : faChevronDown} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default UserCards;
