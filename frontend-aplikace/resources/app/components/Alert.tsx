import React from 'react';
import styles from './Alert.module.scss';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faCheckCircle,
    faExclamationCircle,
    faInfoCircle,
    faTimesCircle,
} from '@fortawesome/free-solid-svg-icons';

interface AlertProps {
    message: string;
    type?: 'success' | 'error' | 'info' | 'warning';
    onClose?: () => void;
    onClick?: () => void;
}

const Alert: React.FC<AlertProps> = ({ message, type = 'info', onClose, onClick }) => {
    const getIcon = () => {
        switch (type) {
            case 'success':
                return faCheckCircle;
            case 'error':
                return faExclamationCircle;
            case 'warning':
                return faTimesCircle;
            case 'info':
            default:
                return faInfoCircle;
        }
    };

    return (
        <div
            className={`${styles.alert} ${styles[type]}`}
            onClick={onClick}
            style={onClick ? { cursor: 'pointer' } : {}}
        >
            <FontAwesomeIcon icon={getIcon()} className={styles.icon} />
            <span>{message}</span>
            {onClose && (
                <button className={styles.closeButton} onClick={onClose}>
                    &times;
                </button>
            )}
        </div>
    );
};

export default Alert;
