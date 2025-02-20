import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPen,
  faTrash,
  faChevronDown,
  faChevronUp,
  faCopy,
  faCalendarDays,
  faTasks,
} from '@fortawesome/free-solid-svg-icons';
import JobTitle from '@/components/JobTitle';
import Loader from '@/components/Loader';
import styles from './MyReportCards.module.scss';
import { useJobTitles } from '@/providers/JobTitleProvider';
import { Report } from '@/providers/ReportProvider';

interface MyReportCardsProps {
  reports: Report[] | null;
  isLoading: boolean;
  onEdit: (id: string) => void;
  onDelete: (report: Report) => void;
  onDuplicate: (id: string) => void;
}

const MyReportCards: React.FC<MyReportCardsProps> = ({
  reports,
  isLoading,
  onEdit,
  onDelete,
  onDuplicate,
}) => {
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const { loading: jobTitlesLoading } = useJobTitles();

  const toggleCard = (id: string) => {
    setExpandedCard(expandedCard === id ? null : id);
  };

  if (isLoading || jobTitlesLoading) {
    return (
      <div className={styles.loaderContainer}>
        <Loader isContentOnly />
      </div>
    );
  }

  return (
    <div className={styles.cards}>
      {(!reports || reports.length === 0) && (
        <div className={styles.noReports}>Žádné výkazy nejsou k dispozici.</div>
      )}
      {reports &&
        reports.map((report) => (
          <div
            key={report.id}
            className={`${styles.card} ${!report.task_name ? styles.unknown : ''}`}
          >
            <div className={styles.cardHeader}>
              <div className={styles.topRow}>
                <div className={styles.contentContainer}>
                  <span className={styles.date}>
                    <FontAwesomeIcon icon={faCalendarDays} />
                    {new Date(report.date).toLocaleDateString()}
                  </span>
                  <JobTitle returnType={'icon'} id={report.job_title_id} />
                </div>
                <button
                  className={styles.editButton}
                  onClick={() => onEdit(report.id)}
                  key={`edit-${report.id}`}
                >
                  <FontAwesomeIcon icon={faPen} />
                </button>
              </div>

              <div
                className={`${styles.cardBodyWrapper} ${
                  expandedCard === report.id ? styles.expanded : styles.collapsed
                }`}
              >
                <div className={styles.cardBody}>
                  <div className={styles.infoRow}>
                    <span className={styles.task}>
                      <FontAwesomeIcon icon={faTasks} />
                      {report.task_name || 'NEZADÁNO'}
                    </span>
                    <button
                      className={styles.duplicateButton}
                      onClick={() => onDuplicate(report.id)}
                      key={`duplicate-${report.id}`}
                    >
                      <FontAwesomeIcon icon={faCopy} />
                    </button>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.summary}>{report.summary}</span>
                    <button
                      className={styles.deleteButton}
                      onClick={() => onDelete(report)}
                      key={`delete-${report.id}`}
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                </div>
              </div>

              <div className={styles.secondRow}>
                <div className={styles.contentContainer}>
                  <span className={styles.client}>
                    {report.client_name && report.client_name.length > 40
                      ? `${report.client_name.slice(0, 40)}...`
                      : report.client_name || 'NEZADÁNO'}
                  </span>
                  <span className={styles.length}>{report.length} h</span>
                </div>
                <button
                  className={styles.toggleButton}
                  onClick={() => toggleCard(report.id)}
                  key={`toggle-${report.id}`}
                >
                  <FontAwesomeIcon
                    icon={expandedCard === report.id ? faChevronUp : faChevronDown}
                  />
                </button>
              </div>
            </div>
          </div>
        ))}
    </div>
  );
};

export default MyReportCards;
