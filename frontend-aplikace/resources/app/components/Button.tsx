import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { useNetwork } from '@/providers/NetworkProvider';
import classNames from 'classnames';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    uniqueKey?: React.Key;
    disabled?: boolean;
    children?: React.ReactNode;
    icon?: IconDefinition;
    iconPosition?: 'left' | 'right';
}

const Button: React.FC<ButtonProps> = ({
       uniqueKey,
       className,
       disabled,
       children,
       icon,
       iconPosition = 'left',
       onClick,
       ...rest
   }) => {
    const { isOnline } = useNetwork();
    const isDisabled = !isOnline || disabled;

    return (
        <button
            data-key={uniqueKey}
            className={classNames(className, { disabled: isDisabled })}
            disabled={isDisabled}
            onClick={onClick}
            title={!isOnline ? 'Jste offline.' : undefined}
            {...rest}
        >
            {icon && iconPosition === 'left' && (
                <FontAwesomeIcon icon={icon} style={{ marginRight: children ? '0.5rem' : '0' }} />
            )}
            {children}
            {icon && iconPosition === 'right' && (
                <FontAwesomeIcon icon={icon} style={{ marginLeft: children ? '0.5rem' : '0' }} />
            )}
        </button>
    );
};

export default Button;
