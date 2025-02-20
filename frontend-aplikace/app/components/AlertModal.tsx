import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import styles from './AlertModal.module.scss';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import Button from './Button';

interface AlertModalProps {
  title?: string;
  message: string;
  userName?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const AlertModal: React.FC<AlertModalProps> = ({
  title = 'Potvrzení akce',
  message,
  userName,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  return ReactDOM.createPortal(
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <FontAwesomeIcon icon={faExclamationTriangle} className={styles.icon} />
          <h2>{title}</h2>
        </div>
        <div className={styles.body}>
          <p>
            {message}{' '}
            {userName && (
              <span className={styles.userName}>
                <strong>{userName}</strong>
              </span>
            )}
          </p>
        </div>
        <div className={styles.footer}>
          <Button className={styles.cancelButton} onClick={onCancel}>
            Zrušit
          </Button>
          <Button className={styles.confirmButton} onClick={onConfirm}>
            Potvrdit
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default AlertModal;
