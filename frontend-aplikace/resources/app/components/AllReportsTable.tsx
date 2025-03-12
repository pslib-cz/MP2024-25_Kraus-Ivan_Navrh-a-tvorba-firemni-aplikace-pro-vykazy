import React, { useEffect, useRef, useState } from 'react';
import {
  createColumnHelper,
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  ColumnDef,
  flexRender,
  SortingState,
  ColumnOrderState,
  OnChangeFn,
  Row,
} from '@tanstack/react-table';
import { getGroupedRowModel } from '@tanstack/react-table';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarDays,
  faUser,
  faBriefcase,
  faTasks,
  faPenToSquare,
  faSort,
  faSortDown,
  faSortUp,
  faClock,
  faQuestionCircle,
  faHourglass2,
  faCheckCircle,
  faPen,
  faTrash,
  faCheck,
} from '@fortawesome/free-solid-svg-icons';

import Button from '@/components/Button';
import Loader from '@/components/Loader';
import JobTitle from '@/components/JobTitle';
import { Report } from '@/providers/ReportProvider';
import styles from '../pages/AllReports.module.scss';

// Interface pro AllReportsTable
type AllReportsTableProps = {
  data: Report[];
  loading: boolean;
  error?: string | null;
  sorting: SortingState;
  onSortingChange: OnChangeFn<SortingState>;
  columnOrder: ColumnOrderState;
  onColumnOrderChange: (
    newOrder: ColumnOrderState | ((old: ColumnOrderState) => ColumnOrderState),
  ) => void;
  selectedRows: Record<string, boolean>;
  onToggleRow: (reportId: string) => void;
  onToggleSelectAll: (checked: boolean, rowIds: string[]) => void;
  onApproveSingle: (reportId: string, reportSummary: string) => Promise<void>;
  onEditReport: (reportId: string) => void;
  onDeleteReport: (report: Report) => void;
};

const AllReportsTable: React.FC<AllReportsTableProps> = ({
  data,
  loading,
  error,
  sorting,
  onSortingChange,
  columnOrder,
  onColumnOrderChange,
  selectedRows,
  onToggleRow,
  onToggleSelectAll,
  onApproveSingle,
  onEditReport,
  onDeleteReport,
}) => {
  // Stavy a refy pro sticky headers tabulky
  const thRefs = useRef<(HTMLTableCellElement | null)[]>([]);
  const [stickyHeaders, setStickyHeaders] = useState<boolean[]>([]);

  const columnHelper = createColumnHelper<Report>();

  // Definice sloupců tabulky
  const columns: ColumnDef<Report, any>[] = [
    columnHelper.accessor('date', {
      id: 'date',
      header: () => {
        const selectableReports = data.filter(
          (r) => !r.approved && r.task_name && r.task_name !== 'NEZADÁNO',
        );
        const allSelected =
          selectableReports.length > 0 && selectableReports.every((r) => selectedRows[r.id]);
        return (
          <div className={styles.headerContent}>
            {selectableReports.length > 0 && (
              <input
                type="checkbox"
                checked={allSelected}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) =>
                  onToggleSelectAll(
                    e.target.checked,
                    selectableReports.map((r) => r.id),
                  )
                }
              />
            )}
            <FontAwesomeIcon icon={faCalendarDays} />
            <span>Datum</span>
          </div>
        );
      },
      cell: ({ row, getValue }) => {
        const dateStr = new Date(getValue()).toLocaleDateString();
        const rep = row.original;
        const isApproved = rep.approved;
        const isUnknown = rep.id?.includes('unknown');
        if (isUnknown || isApproved) {
          return <span>{dateStr}</span>;
        }
        return (
          <div className={styles.selectionDateCell}>
            <input
              type="checkbox"
              checked={selectedRows[rep.id]}
              onChange={() => onToggleRow(rep.id)}
            />
            <span>{dateStr}</span>
          </div>
        );
      },
    }),
    columnHelper.accessor('user_name', {
      id: 'user_name',
      header: 'Uživatel',
    }),
    columnHelper.accessor((row) => row.client_name ?? '', {
      id: 'client_name',
      header: 'Klient',
    }),
    columnHelper.accessor((row) => row.task_name ?? 'NEZADÁNO', {
      id: 'task_name',
      header: 'Úkol',
    }),
    columnHelper.accessor('summary', {
      id: 'summary',
      header: 'Popis',
      cell: (info) => {
        const value = info.getValue() || '';
        return value.length > 160 ? `${value.slice(0, 100)}...` : value;
      },
    }),
    columnHelper.accessor((row) => row.job_title_id, {
      id: 'job_title_name',
      header: () => <FontAwesomeIcon icon={faUser} />,
      cell: ({ row }) => (
        <div className={styles.hoverTooltip}>
          <JobTitle id={row.original.job_title_id} returnType="icon" />
          <span className={styles.hoverTooltipText}>
            {row.original.job_title_name || 'Neznámá role'}
          </span>
        </div>
      ),
    }),
    columnHelper.accessor('length', {
      id: 'length',
      header: () => <FontAwesomeIcon icon={faClock} />,
      cell: (info) => `${info.getValue()} h`,
    }),
    columnHelper.accessor('approved', {
      id: 'approved',
      header: () => <FontAwesomeIcon icon={faQuestionCircle} />,
      cell: (info) => {
        const approved = info.getValue();
        return approved ? (
          <span className={`${styles.approvedBadge} ${styles.hoverTooltip}`}>
            <FontAwesomeIcon icon={faCheckCircle} />
            <span className={styles.hoverTooltipText}>Schváleno</span>
          </span>
        ) : (
          <span className={`${styles.notApprovedBadge} ${styles.hoverTooltip}`}>
            <FontAwesomeIcon icon={faHourglass2} />
            <span className={styles.hoverTooltipText}>Ke schválení</span>
          </span>
        );
      },
    }),
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: ({ row }) => {
        const rep = row.original;
        return (
          <div className={styles.actionContainer}>
            <Button
              className={`${styles.actionButton} ${styles.editButton}`}
              onClick={() => onEditReport(rep.id)}
              icon={faPen}
              title="Upravit"
            />
            <Button
              className={`${styles.actionButton} ${styles.deleteButton}`}
              onClick={() => onDeleteReport(rep)}
              icon={faTrash}
              title="Smazat"
            />
            {!rep.approved && (
              <Button
                className={`${styles.actionButton} ${styles.approveButton}`}
                onClick={() => onApproveSingle(rep.id, rep.summary)}
                icon={faCheck}
                title="Schválit"
              />
            )}
          </div>
        );
      },
    },
  ];

  // Instance tabulky
  const table = useReactTable<Report>({
    data,
    columns,
    state: {
      sorting,
      columnOrder,
    },
    onSortingChange,
    onColumnOrderChange,
    manualSorting: true,
    enableMultiSort: true,
    getCoreRowModel: getCoreRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // Sledování scrollu pro sticky headers tabulky
  useEffect(() => {
    const handleScroll = () => {
      const newStickyHeaders = thRefs.current.map((th) => {
        if (th) {
          const rect = th.getBoundingClientRect();
          return rect.top <= 0;
        }
        return false;
      });
      setStickyHeaders(newStickyHeaders);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Seskupení řádků podle data
  const allRows = table.getRowModel().rows;
  const groupedRows: { dateKey: string; rows: Row<Report>[] }[] = [];
  allRows.forEach((row) => {
    const dateKey = new Date(row.original.date).toISOString().split('T')[0];
    if (!groupedRows.length || groupedRows[groupedRows.length - 1].dateKey !== dateKey) {
      groupedRows.push({ dateKey, rows: [row] });
    } else {
      groupedRows[groupedRows.length - 1].rows.push(row);
    }
  });

  return (
    <>
      {error && <p className={styles.error}>Chyba: {error}</p>}

      <table className={styles.table}>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header, index) => {
                const colId = header.id;
                const isActionColumn = colId === 'actions';
                const isSmallColumn = ['job_title_name', 'length', 'approved'].includes(colId);

                const thClasses = [
                  isSmallColumn ? styles.smallColumn : '',
                  isActionColumn ? styles.actionColumn : '',
                  stickyHeaders[index] ? styles.isSticky : '',
                ]
                  .filter(Boolean)
                  .join(' ');

                const handleDragStart = (e: React.DragEvent<HTMLTableHeaderCellElement>) => {
                  e.dataTransfer.setData('columnId', header.id);
                };
                const handleDragOver = (e: React.DragEvent<HTMLTableHeaderCellElement>) => {
                  e.preventDefault();
                };
                const handleDrop = (e: React.DragEvent<HTMLTableHeaderCellElement>) => {
                  e.preventDefault();
                  const draggedColumnId = e.dataTransfer.getData('columnId');
                  const targetColumnId = header.id;
                  if (draggedColumnId === targetColumnId) return;
                  onColumnOrderChange((oldOrder) => {
                    const newOrder = [...oldOrder];
                    const fromIndex = newOrder.indexOf(draggedColumnId);
                    const toIndex = newOrder.indexOf(targetColumnId);
                    if (fromIndex === -1 || toIndex === -1) return oldOrder;
                    newOrder.splice(toIndex, 0, newOrder.splice(fromIndex, 1)[0]);
                    return newOrder;
                  });
                };

                return (
                  <th
                    key={header.id}
                    ref={(el) => (thRefs.current[index] = el)}
                    className={thClasses}
                    onClick={!isActionColumn ? header.column.getToggleSortingHandler() : undefined}
                    draggable
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    <div className={styles.headerContent}>
                      <div className={styles.headerTitle}>
                        {header.column.columnDef.header === 'Klient' && (
                          <FontAwesomeIcon icon={faBriefcase} />
                        )}
                        {header.column.columnDef.header === 'Úkol' && (
                          <FontAwesomeIcon icon={faTasks} />
                        )}
                        {header.column.columnDef.header === 'Popis' && (
                          <FontAwesomeIcon icon={faPenToSquare} />
                        )}
                        {header.column.columnDef.header === 'Uživatel' && (
                          <FontAwesomeIcon icon={faUser} />
                        )}
                        <span>
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </span>
                      </div>
                      {!isActionColumn && (
                        <>
                          {header.column.getIsSorted() === 'asc' ? (
                            <FontAwesomeIcon icon={faSortUp} />
                          ) : header.column.getIsSorted() === 'desc' ? (
                            <FontAwesomeIcon icon={faSortDown} />
                          ) : (
                            <FontAwesomeIcon className={styles.iconGrey} icon={faSort} />
                          )}
                        </>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>

        {loading ? (
          <tbody>
            <tr>
              <td colSpan={columns.length}>
                <Loader isContentOnly />
              </td>
            </tr>
          </tbody>
        ) : !error && data.length > 0 ? (
          groupedRows.map((group) => (
            <tbody key={group.dateKey}>
              {group.rows.map((row) => {
                const rep = row.original;
                const isUnknown = rep.id && rep.id.includes('unknown');
                const rowClass = [
                  isUnknown ? styles.unknown : '',
                  rep.approved ? styles.approved : styles.pending,
                ]
                  .filter(Boolean)
                  .join(' ');
                return (
                  <tr key={row.id} className={rowClass}>
                    {row.getVisibleCells().map((cell) => {
                      const colId = cell.column.id;
                      const isSmallCell = ['job_title_name', 'length', 'approved'].includes(colId);
                      return (
                        <td key={cell.id} className={isSmallCell ? styles.smallColumn : ''}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              <tr className={styles.emptySpacerRow}>
                <td colSpan={columns.length} />
              </tr>
            </tbody>
          ))
        ) : (
          <tbody>
            <tr>
              <td colSpan={columns.length} className={styles.noResults}>
                {error ? 'Chyba při načítání výkazů.' : 'Žádné výkazy nejsou k dispozici.'}
              </td>
            </tr>
          </tbody>
        )}
      </table>
    </>
  );
};

export default AllReportsTable;
