import React from 'react';
import classNames from 'classnames';
import styles from './Loader.module.scss';

interface LoaderProps {
  isContentOnly?: boolean;
  className?: string;
}

const Loader: React.FC<LoaderProps> = ({ isContentOnly = false, className }) => {
  return (
    <div className={classNames(styles.loader, { [styles.contentOnly]: isContentOnly }, className)}>
      <div className={styles.spinner}></div>
    </div>
  );
};

export default Loader;
