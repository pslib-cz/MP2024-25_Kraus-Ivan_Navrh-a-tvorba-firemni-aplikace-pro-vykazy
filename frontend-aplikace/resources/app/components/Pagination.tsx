import React, { useEffect, useState } from 'react';
import styles from './Pagination.module.scss';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

// Interface pro Pagination
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  // Maximální počet viditelných stránek
  const [maxVisiblePages, setMaxVisiblePages] = useState<number>(5);

  // Změna maxVisiblePages podle typu zařízení
  useEffect(() => {
    const updateMaxVisiblePages = () => {
      setMaxVisiblePages(window.innerWidth < 768 ? 5 : 5);
    };

    updateMaxVisiblePages();
    window.addEventListener('resize', updateMaxVisiblePages);
    return () => window.removeEventListener('resize', updateMaxVisiblePages);
  }, []);

  // Generace čísel stránek
  const generatePageNumbers = () => {
    const pageNumbers = [];
    const isMobile = window.innerWidth < 768;

    if (isMobile) {
      pageNumbers.push(1);
      if (currentPage > 2) pageNumbers.push('...');
      if (currentPage > 1 && currentPage < totalPages) pageNumbers.push(currentPage);
      if (currentPage < totalPages - 1) pageNumbers.push('...');
      if (totalPages > 1) pageNumbers.push(totalPages);
    } else {
      pageNumbers.push(1);
      if (currentPage > maxVisiblePages - 1) {
        pageNumbers.push('...');
      }
      for (
        let i = Math.max(2, currentPage - Math.floor(maxVisiblePages / 2));
        i <= Math.min(totalPages - 1, currentPage + Math.floor(maxVisiblePages / 2));
        i++
      ) {
        pageNumbers.push(i);
      }
      if (currentPage < totalPages - (maxVisiblePages - 2)) {
        pageNumbers.push('...');
      }
      if (totalPages > 1) {
        pageNumbers.push(totalPages);
      }
    }

    return pageNumbers;
  };

  // Přechod na stránku
  const handlePageClick = (page: number | string) => {
    if (typeof page === 'number' && page > 0 && page <= totalPages) {
      onPageChange(page);
    }
  };

  return (
    <div className={styles.pagination}>
      <button
        className={styles.arrow}
        onClick={() => handlePageClick(currentPage - 1)}
        disabled={currentPage === 1}
      >
        <FontAwesomeIcon icon={faChevronLeft} />
      </button>

      {generatePageNumbers().map((page, index) =>
        page === '...' ? (
          <span key={index} className={styles.ellipsis}>
            {page}
          </span>
        ) : (
          <button
            key={index}
            className={`${styles.pageNumber} ${currentPage === page ? styles.active : ''}`}
            onClick={() => handlePageClick(page)}
          >
            {page}
          </button>
        ),
      )}

      <button
        className={styles.arrow}
        onClick={() => handlePageClick(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        <FontAwesomeIcon icon={faChevronRight} />
      </button>
    </div>
  );
};

export default Pagination;
