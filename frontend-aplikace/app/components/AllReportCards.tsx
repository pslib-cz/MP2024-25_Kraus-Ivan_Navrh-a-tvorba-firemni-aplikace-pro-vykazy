import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPen,
  faTrash,
  faCheck,
  faChevronDown,
  faChevronUp,
  faCalendarDays,
  faHourglass2,
  faUser,
  faCheckCircle,
  faTasks,
} from '@fortawesome/free-solid-svg-icons';
import JobTitle from '@/components/JobTitle';
import Loader from '@/components/Loader';
import styles from './AllReportCards.module.scss';
import { Report } from '@/providers/ReportProvider';

interface AllReportCardsProps {
  reports: Report[] | null;
  isLoading: boolean;
  onEdit: (id: string) => void;
  onDelete: (report: Report) => void;
  onApproveSingle: (reportId: string, reportSummary: string) => void;
  selectedRows: Record<string, boolean>;
  onToggleSelect: (reportId: string) => void;
  onToggleSelectAll: (checked: boolean, currentPageRows: string[]) => void;
}

const AllReportCards: React.FC<AllReportCardsProps> = ({
  reports,
  isLoading,
  onEdit,
  onDelete,
  onApproveSingle,
  selectedRows,
  onToggleSelect,
  onToggleSelectAll,
}) => {
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const selectableReports = reports?.filter((report) => !report.approved) || [];

  const toggleCard = (id: string) => {
    setExpandedCard(expandedCard === id ? null : id);
  };

  const truncateText = (text: string, maxLength: number) => {
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
  };

  if (isLoading) {
    return (
      <div className={styles.loaderContainer}>
        <Loader isContentOnly />
      </div>
    );
  }

  return (
    <div className={styles.cards}>
      {selectableReports.length > 0 && (
        <div className={styles.selectAllContainer}>
          <label className={styles.selectAllLabel}>
            <input
              type="checkbox"
              checked={selectableReports.every((report) => selectedRows[report.id])}
              onChange={(e) =>
                onToggleSelectAll(
                  e.target.checked,
                  selectableReports.map((report) => report.id),
                )
              }
            />
            Vybrat vše
          </label>
        </div>
      )}

      {(!reports || reports.length === 0) && (
        <div className={styles.noReports}>Žádné výkazy nejsou k dispozici.</div>
      )}

      {reports &&
        reports.map((report) => (
          <div
            key={report.id}
            className={`${styles.card} ${report.approved ? styles.approved : ''} ${
              !report.task_name ? styles.unknown : ''
            }`}
          >
            <div className={styles.cardHeader}>
              <div className={styles.topRow}>
                <div className={styles.rowContent}>
                  <div className={styles.dateContainer}>
                    {!report.approved && (
                      <input
                        type="checkbox"
                        className={styles.checkbox}
                        checked={selectedRows[report.id] || false}
                        onChange={() => onToggleSelect(report.id)}
                      />
                    )}
                    <span className={styles.date}>
                      <FontAwesomeIcon icon={faCalendarDays} />
                      {new Date(report.date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className={styles.icons}>
                    <JobTitle returnType="icon" id={report.job_title_id} />
                    <span className={styles.statusIcon}>
                      <FontAwesomeIcon icon={report.approved ? faCheckCircle : faHourglass2} />
                    </span>
                  </div>
                </div>
                <button
                  className={styles.editButton}
                  onClick={() => onEdit(report.id)}
                  key={`edit-${report.id}`}
                >
                  <FontAwesomeIcon icon={faPen} />
                </button>
              </div>

              <div className={styles.userRow}>
                <div className={styles.userRowContainer}>
                  <span className={styles.userName}>
                    <FontAwesomeIcon icon={faUser} />
                    {report.user_name}
                  </span>
                  <span className={styles.length}>{report.length} h</span>
                </div>

                {!report.approved ? (
                  <button
                    className={styles.approveButton}
                    onClick={() => onApproveSingle(report.id, report.summary)}
                  >
                    <FontAwesomeIcon icon={faCheck} />
                  </button>
                ) : (
                  <button className={`${styles.approveButton} ${styles.disabled}`} disabled>
                    <FontAwesomeIcon icon={faCheck} />
                  </button>
                )}
              </div>

              <div
                className={`${styles.expandedRow} ${
                  expandedCard === report.id ? styles.expanded : ''
                }`}
              >
                <div className={styles.expandedRowContent}>
                  <span className={styles.taskName}>
                    <FontAwesomeIcon icon={faTasks} />{' '}
                    {truncateText(report.task_name || 'NEZADÁNO', 35)}
                  </span>
                  <span className={styles.summary}>{truncateText(report.summary, 75)}</span>
                </div>
                <button className={styles.deleteButton} onClick={() => onDelete(report)}>
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              </div>

              <div className={styles.clientRow}>
                <span className={styles.clientName}>{report.client_name || 'NEZADÁNO'}</span>

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

export default AllReportCards;
