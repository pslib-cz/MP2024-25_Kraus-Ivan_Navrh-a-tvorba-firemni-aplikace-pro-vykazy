import React, { useEffect, useRef } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  ColumnDef,
  SortingState,
  ColumnOrderState,
  OnChangeFn,
  Row,
} from '@tanstack/react-table';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarDays,
  faBriefcase,
  faTasks,
  faPenToSquare,
  faClock,
  faSort,
  faSortUp,
  faSortDown,
  faTrash,
  faPen,
  faCopy,
  faUser,
} from '@fortawesome/free-solid-svg-icons';

import JobTitle from '@/components/JobTitle';
import Button from '@/components/Button';
import Loader from '@/components/Loader';

import { Report } from '@/providers/ReportProvider';

import styles from '../pages/MyReports.module.scss';

interface MyReportsTableProps {
  data: Report[];
  loading: boolean;
  error?: string | null;
  sorting: SortingState;
  onSortingChange: OnChangeFn<SortingState>;
  columnOrder: ColumnOrderState;
  onColumnOrderChange: (
    updater: ColumnOrderState | ((old: ColumnOrderState) => ColumnOrderState),
  ) => void;
  onEdit: (reportId: string) => void;
  onDuplicate: (reportId: string) => void;
  onDelete: (reportId: string) => void;
}

const MyReportsTable: React.FC<MyReportsTableProps> = ({
  data,
  loading,
  error,
  sorting,
  onSortingChange,
  columnOrder,
  onColumnOrderChange,
  onEdit,
  onDuplicate,
  onDelete,
}) => {
  const columnHelper = createColumnHelper<Report>();
  const thRefs = useRef<(HTMLTableCellElement | null)[]>([]);
  const [stickyHeaders, setStickyHeaders] = React.useState<boolean[]>([]);

  const columns: ColumnDef<Report, any>[] = [
    columnHelper.accessor('date', {
      id: 'date',
      header: 'Datum',
      cell: (info) => {
        const raw = info.getValue();
        return new Date(raw).toLocaleDateString('cs-CZ', { timeZone: 'UTC' });
      },
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
        return value.length > 160 ? `${value.slice(0, 160)}...` : value;
      },
    }),
    columnHelper.accessor('length', {
      id: 'length',
      header: () => <FontAwesomeIcon icon={faClock} />,
      cell: (info) => `${info.getValue()} h`,
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
              onClick={() => onEdit(rep.id)}
              icon={faPen}
              title="Upravit"
            />
            <Button
              className={`${styles.actionButton} ${styles.duplicateButton}`}
              onClick={() => onDuplicate(rep.id)}
              icon={faCopy}
              title="Duplikovat"
            />
            <Button
              className={`${styles.actionButton} ${styles.deleteButton}`}
              onClick={() => onDelete(rep.id)}
              icon={faTrash}
              title="Smazat"
            />
          </div>
        );
      },
    },
  ];

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
    getSortedRowModel: getSortedRowModel(),
  });

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

  const allRows = table.getRowModel().rows;

  const groupedRows: { dateKey: string; rows: Row<Report>[] }[] = [];

  allRows.forEach((row) => {
    const dateKey = new Date(row.original.date).toISOString().split('T')[0];

    if (groupedRows.length === 0 || groupedRows[groupedRows.length - 1].dateKey !== dateKey) {
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
                const isSlimColumn = ['length', 'job_title_name'].includes(colId);

                const thClasses = [
                  isSlimColumn ? styles.slim : '',
                  isActionColumn ? styles.actionColumn : '',
                  stickyHeaders[index] ? styles.isSticky : '',
                ]
                  .filter(Boolean)
                  .join(' ');

                return (
                  <th
                    key={header.id}
                    ref={(el) => (thRefs.current[index] = el)}
                    className={thClasses}
                    onClick={!isActionColumn ? header.column.getToggleSortingHandler() : undefined}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('columnId', header.id);
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const draggedColumnId = e.dataTransfer.getData('columnId');
                      if (draggedColumnId === header.id) return;
                      onColumnOrderChange((oldOrder) => {
                        const newOrder = [...oldOrder];
                        const fromIndex = newOrder.indexOf(draggedColumnId);
                        const toIndex = newOrder.indexOf(header.id);
                        if (fromIndex === -1 || toIndex === -1) return oldOrder;
                        newOrder.splice(toIndex, 0, newOrder.splice(fromIndex, 1)[0]);
                        return newOrder;
                      });
                    }}
                  >
                    <div className={styles.headerContent}>
                      <div className={styles.headerTitle}>
                        {header.column.columnDef.header === 'Datum' && (
                          <FontAwesomeIcon icon={faCalendarDays} />
                        )}
                        {header.column.columnDef.header === 'Klient' && (
                          <FontAwesomeIcon icon={faBriefcase} />
                        )}
                        {header.column.columnDef.header === 'Úkol' && (
                          <FontAwesomeIcon icon={faTasks} />
                        )}
                        {header.column.columnDef.header === 'Popis' && (
                          <FontAwesomeIcon icon={faPenToSquare} />
                        )}
                        {header.column.columnDef.header === 'Čas' && (
                          <FontAwesomeIcon icon={faClock} />
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
            groupedRows.map((group, groupIndex) => (
                <tbody
                    key={group.dateKey}
                    className={`${styles.groupedTbody} ${groupIndex > 0 ? styles.withGap : ''}`}
                >
                {group.rows.map((row) => {
                    const rep = row.original;
                    const isUnknown = !rep.task_name;
                    const rowClass = isUnknown ? styles.unknown : '';

                    return (
                        <tr key={row.id} className={rowClass}>
                            {row.getVisibleCells().map((cell) => {
                                const colId = cell.column.id;
                                const isSlimCell = ['length', 'job_title_name'].includes(colId);

                                return (
                                    <td key={cell.id} className={isSlimCell ? styles.slim : ''}>
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

export default MyReportsTable;
