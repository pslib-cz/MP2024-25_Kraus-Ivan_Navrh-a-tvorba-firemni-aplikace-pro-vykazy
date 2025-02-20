import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isoWeek from 'dayjs/plugin/isoWeek';

dayjs.extend(isSameOrBefore);
dayjs.extend(isoWeek);

import { useNavigate } from 'react-router-dom';
import { SortingState } from '@tanstack/react-table';

import Menu from '@/components/Menu';
import Header from '@/components/Header';
import InputGroup from '@/components/InputGroup';
import Button from '@/components/Button';
import Pagination from '@/components/Pagination';
import Loader from '@/components/Loader';
import MyReportCards from '@/components/MyReportCards';
import AlertModal from '@/components/AlertModal';
import MyDatePicker from '@/components/MyDatePicker';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFileAlt,
  faFilter,
  faSearch,
  faChevronDown,
  faClose,
  faFileExport,
  faChevronLeft,
  faChevronRight,
  faCirclePlus,
  faSort,
  faRotate,
  faArrowDownShortWide,
  faArrowUpWideShort,
} from '@fortawesome/free-solid-svg-icons';

import { useReportContext, Report } from '@/providers/ReportProvider';
import { useAuthContext } from '@/providers/AuthProvider';
import { useClientContext } from '@/providers/ClientsProvider';
import { useTasksContext, Task } from '@/providers/TaskProvider';
import { useMessage } from '@/providers/MessageProvider';

import MyReportsTable from '@/components/MyReportsTable';

import styles from './MyReports.module.scss';

interface ReportData extends Report {}

const MyReports: React.FC = () => {
  const {
    fetchMyReports,
    reports,
    loading,
    error,
    pagination,
    totalHours,
    averageHours,
    deleteReport,
    exportReports,
  } = useReportContext();

  const { user } = useAuthContext();
  const { clients, fetchClients } = useClientContext();
  const { tasks, fetchTasks, activeTasks, fetchActiveTasks, fetchTasksByCompany } =
    useTasksContext();
  const { showMessage } = useMessage();

  const navigate = useNavigate();
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  const [currentPage, setCurrentPage] = useState(() => {
    const savedFilters = JSON.parse(localStorage.getItem('myReportsFilters') || '{}');
    return savedFilters.currentPage || 1;
  });

  const [pageSize, setPageSize] = useState(() => {
    const savedFilters = JSON.parse(localStorage.getItem('myReportsFilters') || '{}');
    return savedFilters.pageSize || 10;
  });

  const [isPageSizeManuallySet, setIsPageSizeManuallySet] = useState(false);

  const [columnOrder, setColumnOrder] = useState<string[]>([]);

  const [sorting, setSorting] = useState<SortingState>(() => {
    const savedFilters = JSON.parse(localStorage.getItem('myReportsFilters') || '{}');
    return savedFilters.sorting || [{ id: 'date', desc: true }];
  });

  const [globalFilter, setGlobalFilter] = useState(() => {
    const savedFilters = JSON.parse(localStorage.getItem('myReportsFilters') || '{}');
    return savedFilters.globalFilter || '';
  });

  const [filterClient, setFilterClient] = useState(() => {
    const savedFilters = JSON.parse(localStorage.getItem('myReportsFilters') || '{}');
    return savedFilters.filterClient || '';
  });

  const [filterTask, setFilterTask] = useState(() => {
    const savedFilters = JSON.parse(localStorage.getItem('myReportsFilters') || '{}');
    return savedFilters.filterTask || '';
  });

  const [showAllTasks, setShowAllTasks] = useState<boolean>(() => {
    const savedFilters = JSON.parse(localStorage.getItem('myReportsFilters') || '{}');
    if (savedFilters.showAllTasks !== undefined) {
      return savedFilters.showAllTasks;
    }
    return user?.show_all_tasks || false;
  });

  const [dateFrom, setDateFrom] = useState<Date | null>(() => {
    const savedFilters = JSON.parse(localStorage.getItem('myReportsFilters') || '{}');
    return savedFilters.dateFrom ? new Date(savedFilters.dateFrom) : null;
  });
  const [dateTo, setDateTo] = useState<Date | null>(() => {
    const savedFilters = JSON.parse(localStorage.getItem('myReportsFilters') || '{}');
    return savedFilters.dateTo ? new Date(savedFilters.dateTo) : null;
  });
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');

  const [activeRange, setActiveRange] = useState<'' | 'today' | 'thisWeek' | 'thisMonth'>(() => {
    const savedFilters = JSON.parse(localStorage.getItem('myReportsFilters') || '{}');
    return savedFilters.activeRange || '';
  });

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(() => {
    const savedFilters = JSON.parse(localStorage.getItem('myReportsFilters') || '{}');
    return !!(
      savedFilters.dateFrom ||
      savedFilters.dateTo ||
      savedFilters.filterClient ||
      savedFilters.filterTask ||
      savedFilters.showAllTasks
    );
  });
  const [showAdvancedFiltersMobile, setShowAdvancedFiltersMobile] = useState<boolean>(() => {
    const savedFilters = JSON.parse(localStorage.getItem('myReportsFilters') || '{}');
    return !!(
      savedFilters.dateFrom ||
      savedFilters.dateTo ||
      savedFilters.filterClient ||
      savedFilters.filterTask ||
      savedFilters.showAllTasks
    );
  });

  const [selectTasks, setSelectTasks] = useState<Task[]>([]);
  const [selectedSort, setSelectedSort] = useState<{ value: string; label: string }>({
    value: 'date',
    label: 'Datum',
  });

  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [selectedReport, setSelectedReport] = useState<ReportData | null>(null);

  useEffect(() => {
    const filtersToSave = {
      activeRange,
      dateFrom: dateFrom ? dayjs(dateFrom).format('YYYY-MM-DD') : null,
      dateTo: dateTo ? dayjs(dateTo).format('YYYY-MM-DD') : null,
      globalFilter,
      filterClient,
      filterTask,
      showAllTasks,
      currentPage,
      pageSize,
      sorting,
    };
    localStorage.setItem('myReportsFilters', JSON.stringify(filtersToSave));
  }, [
    activeRange,
    dateFrom,
    dateTo,
    globalFilter,
    filterClient,
    filterTask,
    showAllTasks,
    currentPage,
    pageSize,
    sorting,
  ]);

  useEffect(() => {
    if (user) {
      (async () => {
        await Promise.all([fetchTasks(), fetchActiveTasks(), fetchClients()]);
      })();
    }
  }, [user, fetchTasks, fetchActiveTasks, fetchClients]);

  useEffect(() => {
    (async () => {
      if (filterClient) {
        const taskData = await fetchTasksByCompany(filterClient, showAllTasks);
        setSelectTasks(taskData);
      } else {
        setSelectTasks([]);
      }
    })();
  }, [filterClient, showAllTasks, fetchTasksByCompany]);

  useEffect(() => {
    const saved = localStorage.getItem('myReportsColumnOrder');
    if (saved) {
      try {
        setColumnOrder(JSON.parse(saved));
      } catch {}
    }
  }, []);
  useEffect(() => {
    localStorage.setItem('myReportsColumnOrder', JSON.stringify(columnOrder));
  }, [columnOrder]);

  const handleTaskFilterChange = () => {
    const options = showAllTasks ? tasks : activeTasks;
    setSelectTasks(options);
  };
  useEffect(() => {
    handleTaskFilterChange();
  }, [showAllTasks, tasks, activeTasks]);

  useEffect(() => {
    const handleResize = () => {
      if (!isPageSizeManuallySet) {
        setPageSize(window.innerWidth < 768 ? 5 : 10);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isPageSizeManuallySet]);

  useEffect(() => {
    setFilterDateFrom(dateFrom ? dayjs(dateFrom).format('YYYY-MM-DD') : '');
  }, [dateFrom]);
  useEffect(() => {
    setFilterDateTo(dateTo ? dayjs(dateTo).format('YYYY-MM-DD') : '');
  }, [dateTo]);

  const handleResetFilters = async () => {
    setGlobalFilter('');
    setDateFrom(null);
    setDateTo(null);
    setFilterClient('');
    setFilterTask('');
    setSorting([{ id: 'date', desc: true }]);
    setCurrentPage(1);
    setPageSize(10);
    setActiveRange('');
    handleTaskFilterChange();
    setShowAllTasks(user ? user.show_all_tasks : false);
    setSelectTasks([]);
    setSelectedSort({ value: 'date', label: 'Datum' });
    setShowAdvancedFilters(false);
    setShowAdvancedFiltersMobile(false);
  };

  const handleToday = () => {
    if (activeRange === 'today') {
      setActiveRange('');
      setDateFrom(null);
      setDateTo(null);
    } else {
      setActiveRange('today');
      const today = dayjs();
      setDateFrom(today.toDate());
      setDateTo(today.toDate());
    }
  };

  const handleThisWeek = () => {
    if (activeRange === 'thisWeek') {
      setActiveRange('');
      setDateFrom(null);
      setDateTo(null);
    } else {
      setActiveRange('thisWeek');
      const start = dayjs().startOf('isoWeek');
      const end = dayjs().endOf('isoWeek');
      setDateFrom(start.toDate());
      setDateTo(end.toDate());
    }
  };

  const handleThisMonth = () => {
    if (activeRange === 'thisMonth') {
      setActiveRange('');
      setDateFrom(null);
      setDateTo(null);
    } else {
      setActiveRange('thisMonth');
      const start = dayjs().startOf('month');
      const end = dayjs().endOf('month');
      setDateFrom(start.toDate());
      setDateTo(end.toDate());
    }
  };

  const handleDateFromChange = (newDate: Date | null) => {
    setDateFrom(newDate);
    if (newDate && dateTo && dayjs(newDate).isAfter(dayjs(dateTo))) {
      setDateTo(newDate);
    }
  };
  const handleDateToChange = (newDate: Date | null) => {
    setDateTo(newDate);
    if (newDate && dateFrom && dayjs(newDate).isBefore(dayjs(dateFrom))) {
      setDateFrom(newDate);
    }
  };

  const getCurrentFilters = () => {
    const filters: Record<string, any> = {};
    if (globalFilter) filters.search = globalFilter;
    if (filterDateFrom) filters.date_from = filterDateFrom;
    if (filterDateTo) filters.date_to = filterDateTo;
    if (filterClient) filters.client = filterClient;
    if (filterTask) filters.task = filterTask;
    if (sorting.length > 0) {
      filters.sortBy = sorting.map((s) => s.id).join(',');
      filters.sortDir = sorting.map((s) => (s.desc ? 'desc' : 'asc')).join(',');
    }
    return filters;
  };

  const loadReports = async (page: number, currentSorting?: SortingState) => {
    if (!user) return;
    const sortToUse = currentSorting && currentSorting.length ? currentSorting : sorting;
    const filters = getCurrentFilters();

    if (sortToUse && sortToUse.length > 0) {
      filters.sortBy = sortToUse.map((s) => s.id).join(',');
      filters.sortDir = sortToUse.map((s) => (s.desc ? 'desc' : 'asc')).join(',');
    }

    await fetchMyReports(page, pageSize, filters);
  };

  useEffect(() => {
    if (!user) return;
    loadReports(1);
  }, [user]);

  useEffect(() => {
    if (isFirstLoad) {
      setIsFirstLoad(false);
      return;
    }
    setCurrentPage(1);
    loadReports(1);
  }, [globalFilter, filterDateFrom, filterDateTo, filterClient, filterTask, sorting, pageSize]);

  const handlePageChange = async (newPage: number) => {
    setCurrentPage(newPage);
    loadReports(newPage);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setIsPageSizeManuallySet(true);
    setCurrentPage(1);
  };

  const handleExport = async () => {
    if (!user) return;
    const filters = getCurrentFilters();
    filters.user = user.id;
    const url = await exportReports(filters);
    if (url) {
      window.open(url, '_blank');
    }
  };

  const confirmDelete = async () => {
    if (!selectedReport) return;
    try {
      await deleteReport(selectedReport.id);
      setSelectedReport(null);
      setShowDeleteModal(false);

      const filters = getCurrentFilters();
      await fetchMyReports(currentPage, pageSize, filters);
      const reportName = selectedReport.summary;
      showMessage(`Výkaz "${reportName}" byl úspěšně smazán.`, 'success');
    } catch {
      showMessage('Chyba při mazání výkazu.', 'error');
    }
  };

  const rangeButtonClass = (range: string) =>
    range === activeRange ? styles.activeRangeButton : '';

  const displayedTotal = totalHours ?? 0;
  const displayedAverage = averageHours ?? 0;

  return (
    <div className={styles.layoutContainer}>
      <Menu activeItem="/my-reports" />

      <div className={styles.contentContainer}>
        <Header
          icon={faFileAlt}
          title="Moje výkazy"
          backButton={{ link: '/more', showOn: 'mobile' }}
        />

        <div className={styles.content}>
          <div className={styles.filters}>
            <div className={styles.contentLeft}>
              <Button onClick={() => navigate('/new-report')} className={styles.newReportButton}>
                <FontAwesomeIcon icon={faCirclePlus} />
                Nový výkaz
              </Button>
              <Button onClick={handleToday} className={rangeButtonClass('today')}>
                Dnes
              </Button>
              <Button onClick={handleThisWeek} className={rangeButtonClass('thisWeek')}>
                Tento týden
              </Button>
              <Button onClick={handleThisMonth} className={rangeButtonClass('thisMonth')}>
                Tento měsíc
              </Button>
              <Button
                onClick={() => setShowAdvancedFilters((prev) => !prev)}
                className={
                  showAdvancedFilters
                    ? `${styles.filterToggle} ${styles.activeToggle}`
                    : styles.filterToggle
                }
              >
                {showAdvancedFilters ? (
                  <FontAwesomeIcon icon={faClose} />
                ) : (
                  <FontAwesomeIcon icon={faFilter} />
                )}
                Filtr
              </Button>
            </div>

            <div className={styles.contentMiddle}>
              <span className={styles.totalTime}>
                <div>
                  <span className={styles.averageIcon}>Ø</span> {displayedAverage.toFixed(2)} h
                </div>
                <div>
                  <span className={styles.sumIcon}>∑</span> {displayedTotal.toFixed(2)} h
                </div>
              </span>
            </div>

            <div className={styles.contentRight}>
              <InputGroup
                id="searchInput"
                searchInput
                icon={faSearch}
                placeholder="Hledat..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
              />
              <Button onClick={handleResetFilters} className={styles.resetButton}>
                <FontAwesomeIcon icon={faRotate} />
              </Button>
            </div>
          </div>

          <div className={`${styles.advancedFilters} ${showAdvancedFilters ? styles.isOpen : ''}`}>
            <div className={styles.datepickerRow}>
              <div className={styles.datepickerContainer}>
                <label>Datum OD</label>
                <button
                  type="button"
                  className={styles.navButtonLeft}
                  onClick={() => {
                    setDateFrom((prev) => {
                      const newDate = prev ? dayjs(prev).subtract(1, 'day').toDate() : null;
                      if (newDate && dateTo && dayjs(newDate).isAfter(dayjs(dateTo))) {
                        setDateTo(newDate);
                      }
                      return newDate;
                    });
                  }}
                >
                  <FontAwesomeIcon icon={faChevronLeft} />
                </button>
                <MyDatePicker
                  selectedDate={dateFrom}
                  onDateChange={(date) => handleDateFromChange(date)}
                  dateFormat="dd. MM. yyyy"
                  placeholderText=""
                />
                <button
                  type="button"
                  className={styles.navButtonRight}
                  onClick={() => {
                    setDateFrom((prev) => {
                      const newDate = prev ? dayjs(prev).add(1, 'day').toDate() : null;
                      if (newDate && dateTo && dayjs(newDate).isAfter(dayjs(dateTo))) {
                        setDateTo(newDate);
                      }
                      return newDate;
                    });
                  }}
                >
                  <FontAwesomeIcon icon={faChevronRight} />
                </button>
              </div>

              <div className={styles.datepickerContainer}>
                <label>Datum DO</label>
                <button
                  type="button"
                  className={styles.navButtonLeft}
                  onClick={() => {
                    setDateTo((prev) => {
                      const newDate = prev ? dayjs(prev).subtract(1, 'day').toDate() : null;
                      if (newDate && dateFrom && dayjs(newDate).isBefore(dayjs(dateFrom))) {
                        setDateFrom(newDate);
                      }
                      return newDate;
                    });
                  }}
                >
                  <FontAwesomeIcon icon={faChevronLeft} />
                </button>
                <MyDatePicker
                  selectedDate={dateTo}
                  onDateChange={(date) => handleDateToChange(date)}
                  dateFormat="dd. MM. yyyy"
                  placeholderText=""
                />
                <button
                  type="button"
                  className={styles.navButtonRight}
                  onClick={() => {
                    setDateTo((prev) => {
                      const newDate = prev ? dayjs(prev).add(1, 'day').toDate() : null;
                      if (newDate && dateFrom && dayjs(newDate).isBefore(dayjs(dateFrom))) {
                        setDateFrom(newDate);
                      }
                      return newDate;
                    });
                  }}
                >
                  <FontAwesomeIcon icon={faChevronRight} />
                </button>
              </div>
            </div>

            <div className={styles.selectFilters}>
              <InputGroup
                id="clientSelect"
                isSelect
                size="small"
                selectOptions={[
                  { value: '', label: 'Všichni klienti' },
                  ...clients.map((client) => ({
                    value: client.id.toString(),
                    label: client.name,
                  })),
                ]}
                value={
                  filterClient
                    ? {
                        value: filterClient,
                        label: clients.find((c) => c.id.toString() === filterClient)?.name || '',
                      }
                    : { value: '', label: 'Všichni klienti' }
                }
                onSelectChange={(selected) => {
                  setFilterClient(selected?.value || '');
                  setFilterTask('');
                }}
              />

              <InputGroup
                id="taskSelect"
                isSelect
                size="small"
                disabled={!filterClient}
                selectOptions={[
                  { value: '', label: 'Všechny úkoly' },
                  ...selectTasks.map((task) => ({
                    value: task.code,
                    label: task.name,
                  })),
                ]}
                value={
                  filterTask
                    ? {
                        value: filterTask,
                        label: selectTasks.find((t) => t.code === filterTask)?.name || '',
                      }
                    : { value: '', label: 'Všechny úkoly' }
                }
                onSelectChange={(selected) => setFilterTask(selected?.value || '')}
              />
            </div>

            {(user?.role.id === 1 || user?.role.id === 2) && (
              <label className={filterClient ? styles.checkbox : styles.checkboxDisabled}>
                <input
                  type="checkbox"
                  checked={showAllTasks}
                  onChange={(e) => setShowAllTasks(e.target.checked)}
                  disabled={!filterClient}
                />
                Zobrazit všechny úkoly
              </label>
            )}

            <Button
              onClick={handleExport}
              className={styles.exportButton}
              style={{ alignSelf: 'flex-end' }}
            >
              <FontAwesomeIcon icon={faFileExport} /> Export
            </Button>
          </div>

          {showDeleteModal && selectedReport && (
            <AlertModal
              title="Smazat výkaz"
              message="Opravdu chcete smazat tento výkaz?"
              userName={selectedReport.summary}
              onConfirm={confirmDelete}
              onCancel={() => setShowDeleteModal(false)}
            />
          )}

          {error && <p className={styles.error}>Chyba: {error}</p>}

          <div className={styles.responsiveContent}>
            <div className={styles.mobileFilters}>
              <div className={styles.rangeSelector}>
                <div className={styles.rangeSelectWrapper}>
                  <select
                    id="activeRangeSelect"
                    value={activeRange}
                    className={styles.rangeSelect}
                    onChange={(e) => {
                      const val = e.target.value as '' | 'today' | 'thisWeek' | 'thisMonth';
                      setActiveRange(val);
                      if (val === 'today') handleToday();
                      if (val === 'thisWeek') handleThisWeek();
                      if (val === 'thisMonth') handleThisMonth();
                    }}
                  >
                    <option value="">Vybrat rozsah</option>
                    <option value="today">Dnes</option>
                    <option value="thisWeek">Tento týden</option>
                    <option value="thisMonth">Tento měsíc</option>
                  </select>
                  <FontAwesomeIcon icon={faChevronDown} className={styles.rangeSelectIcon} />
                </div>
              </div>

              <InputGroup
                id="searchInputMobile"
                searchInput
                icon={faSearch}
                placeholder="Hledat..."
                size="small"
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
              />

              <div className={styles.flexContainer}>
                <div className={styles.totalTime}>
                  <div>
                    <span className={styles.averageIcon}>Ø</span> {displayedAverage.toFixed(2)} h
                  </div>
                  <div>
                    <span className={styles.sumIcon}>∑</span> {displayedTotal.toFixed(2)} h
                  </div>
                </div>
                <div className={styles.topButtons}>
                  <Button
                    onClick={() => setShowAdvancedFiltersMobile((prev) => !prev)}
                    className={`${styles.filterButtonMobile} ${
                      showAdvancedFiltersMobile ? styles.active : ''
                    }`}
                  >
                    {showAdvancedFiltersMobile ? (
                      <FontAwesomeIcon icon={faClose} />
                    ) : (
                      <FontAwesomeIcon icon={faFilter} />
                    )}
                    Filtr
                  </Button>
                  <Button onClick={handleResetFilters} className={styles.resetButton}>
                    <FontAwesomeIcon icon={faRotate} />
                  </Button>
                </div>
              </div>

              <span className={styles.divider}></span>

              <div
                className={`${styles.advancedFiltersMobile} ${
                  showAdvancedFiltersMobile ? styles.visible : styles.hidden
                }`}
              >
                <div className={styles.datepickerRow}>
                  <div className={styles.datepickerContainer}>
                    <label>Datum OD</label>
                    <button
                      type="button"
                      className={styles.navButtonLeft}
                      onClick={() => {
                        setDateFrom((prev) => {
                          const newDate = prev ? dayjs(prev).subtract(1, 'day').toDate() : null;
                          if (newDate && dateTo && dayjs(newDate).isAfter(dayjs(dateTo))) {
                            setDateTo(newDate);
                          }
                          return newDate;
                        });
                      }}
                    >
                      <FontAwesomeIcon icon={faChevronLeft} />
                    </button>
                    <MyDatePicker
                      selectedDate={dateFrom}
                      onDateChange={(date) => handleDateFromChange(date)}
                      dateFormat="dd. MM. yyyy"
                      placeholderText=""
                    />
                    <button
                      type="button"
                      className={styles.navButtonRight}
                      onClick={() => {
                        setDateFrom((prev) => {
                          const newDate = prev ? dayjs(prev).add(1, 'day').toDate() : null;
                          if (newDate && dateTo && dayjs(newDate).isAfter(dayjs(dateTo))) {
                            setDateTo(newDate);
                          }
                          return newDate;
                        });
                      }}
                    >
                      <FontAwesomeIcon icon={faChevronRight} />
                    </button>
                  </div>

                  <div className={styles.datepickerContainer}>
                    <label>Datum DO</label>
                    <button
                      type="button"
                      className={styles.navButtonLeft}
                      onClick={() => {
                        setDateTo((prev) => {
                          const newDate = prev ? dayjs(prev).subtract(1, 'day').toDate() : null;
                          if (newDate && dateFrom && dayjs(newDate).isBefore(dayjs(dateFrom))) {
                            setDateFrom(newDate);
                          }
                          return newDate;
                        });
                      }}
                    >
                      <FontAwesomeIcon icon={faChevronLeft} />
                    </button>
                    <MyDatePicker
                      selectedDate={dateTo}
                      onDateChange={(date) => handleDateToChange(date)}
                      dateFormat="dd. MM. yyyy"
                      placeholderText=""
                    />
                    <button
                      type="button"
                      className={styles.navButtonRight}
                      onClick={() => {
                        setDateTo((prev) => {
                          const newDate = prev ? dayjs(prev).add(1, 'day').toDate() : null;
                          if (newDate && dateFrom && dayjs(newDate).isBefore(dayjs(dateFrom))) {
                            setDateFrom(newDate);
                          }
                          return newDate;
                        });
                      }}
                    >
                      <FontAwesomeIcon icon={faChevronRight} />
                    </button>
                  </div>
                </div>

                <InputGroup
                  id="clientSelectMobile"
                  isSelect
                  size="small"
                  selectOptions={[
                    { value: '', label: 'Všichni klienti' },
                    ...clients.map((client) => ({
                      value: client.id.toString(),
                      label: client.name,
                    })),
                  ]}
                  value={
                    filterClient
                      ? {
                          value: filterClient,
                          label:
                            clients.find((c) => c.id.toString() === filterClient)?.name ||
                            'Neznámý klient',
                        }
                      : { value: '', label: 'Všichni klienti' }
                  }
                  onSelectChange={(selected) => {
                    setFilterClient(selected?.value || '');
                    setFilterTask('');
                  }}
                />

                <InputGroup
                  id="taskSelectMobile"
                  isSelect
                  size="small"
                  disabled={!filterClient}
                  selectOptions={[
                    { value: '', label: 'Všechny úkoly' },
                    ...selectTasks.map((task) => ({
                      value: task.code,
                      label: task.name,
                    })),
                  ]}
                  value={
                    filterTask
                      ? {
                          value: filterTask,
                          label: selectTasks.find((t) => t.code === filterTask)?.name || '',
                        }
                      : { value: '', label: 'Všechny úkoly' }
                  }
                  onSelectChange={(selected) => setFilterTask(selected?.value || '')}
                />

                {(user?.role.id === 1 || user?.role.id === 2) && (
                  <label className={filterClient ? styles.checkbox : styles.checkboxDisabled}>
                    <input
                      type="checkbox"
                      checked={showAllTasks}
                      onChange={(e) => setShowAllTasks(e.target.checked)}
                      disabled={!filterClient}
                    />
                    Zobrazit všechny úkoly
                  </label>
                )}

                <span className={styles.divider}></span>
              </div>

              <div className={styles.sortContainer}>
                <div className={styles.sortSelect}>
                  <label htmlFor="sortSelectMobile">Řadit podle</label>
                  <div className={styles.selectWrapper}>
                    <select
                      id="sortSelectMobile"
                      value={selectedSort?.value}
                      onChange={(e) => {
                        const selectedValue = e.target.value;
                        const options = [
                          { value: 'date', label: 'Datum' },
                          { value: 'client_name', label: 'Klient' },
                          { value: 'task_name', label: 'Úkol' },
                          { value: 'summary', label: 'Popis' },
                          { value: 'job_title_name', label: 'Role' },
                          { value: 'length', label: 'Čas' },
                        ];
                        const selectedOption = options.find((o) => o.value === selectedValue);
                        if (selectedOption) {
                          setSelectedSort(selectedOption);
                          setSorting([{ id: selectedOption.value, desc: false }]);
                        }
                      }}
                    >
                      <option value="" disabled>
                        Vyberte možnost
                      </option>
                      <option value="date">Datum</option>
                      <option value="client_name">Klient</option>
                      <option value="task_name">Úkol</option>
                      <option value="summary">Popis</option>
                      <option value="job_title_name">Role</option>
                      <option value="length">Čas</option>
                    </select>
                    <FontAwesomeIcon icon={faChevronDown} className={styles.selectIcon} />
                  </div>
                </div>

                <Button
                  className={styles.sortOrderButton}
                  onClick={() => {
                    if (!sorting.length) return;
                    setSorting([
                      {
                        id: selectedSort.value,
                        desc: !sorting[0].desc,
                      },
                    ]);
                  }}
                >
                  <FontAwesomeIcon
                    icon={sorting[0]?.desc ? faArrowDownShortWide : faArrowUpWideShort}
                  />
                </Button>

                <div className={styles.pageSizeSelector}>
                  <select
                    id="pageSize"
                    value={pageSize}
                    className={styles.pageSizeSelect}
                    onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  >
                    {[5, 10, 15, 20, 25, 30, 35, 40, 45, 50].map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                  <FontAwesomeIcon icon={faSort} className={styles.selectIcon} />
                </div>
              </div>
            </div>

            {loading ? (
              <div className={styles.loaderContainer}>
                <Loader isContentOnly />
              </div>
            ) : (
              <MyReportCards
                reports={reports}
                isLoading={loading}
                onEdit={(reportId) => {
                  navigate(`/edit-report/${reportId}`, { state: { from: '/my-reports' } });
                }}
                onDelete={(report) => {
                  setSelectedReport(report);
                  setShowDeleteModal(true);
                }}
                onDuplicate={(reportId: string) => {
                  const report = reports.find((r) => r.id === reportId);
                  if (report) {
                    const isKnownTask = report.task_id?.includes('OP');
                    const isUnknownTask = !isKnownTask;
                    const queryParams = new URLSearchParams({
                      summary: report.summary || '',
                      length: report.length || '',
                      date: new Date().toISOString().split('T')[0],
                      ...(isKnownTask ? { task_id: report.task_id } : {}),
                      ...(isUnknownTask && report.client_id
                        ? { client_id: report.client_id.toString() }
                        : {}),
                      ...(report.job_title_id
                        ? { job_title_id: report.job_title_id.toString() }
                        : {}),
                      ...(report.task_subtype ? { task_subtype: report.task_subtype } : {}),
                      from: 'duplicate',
                    }).toString();

                    navigate(`/new-report?${queryParams}`);
                  } else {
                    showMessage('Nepodařilo se načíst data pro duplikaci.', 'error');
                  }
                }}
              />
            )}
          </div>

          <MyReportsTable
            data={reports}
            loading={loading}
            error={error || null}
            sorting={sorting}
            onSortingChange={setSorting}
            columnOrder={columnOrder}
            onColumnOrderChange={setColumnOrder}
            onEdit={(reportId) =>
              navigate(`/edit-report/${reportId}`, { state: { from: '/my-reports' } })
            }
            onDuplicate={(reportId) => {
              const rep = reports.find((r) => r.id === reportId);
              if (!rep) {
                showMessage('Nepodařilo se načíst data pro duplikaci.', 'error');
                return;
              }
              const isKnownTask = rep.task_id?.includes('OP');
              const isUnknownTask = !isKnownTask;
              const queryParams = new URLSearchParams({
                summary: rep.summary || '',
                length: rep.length || '',
                date: new Date().toISOString().split('T')[0],
                ...(isKnownTask ? { task_id: rep.task_id } : {}),
                ...(isUnknownTask && rep.client_id ? { client_id: rep.client_id.toString() } : {}),
                ...(rep.job_title_id ? { job_title_id: rep.job_title_id.toString() } : {}),
                ...(rep.task_subtype ? { task_subtype: rep.task_subtype } : {}),
                from: 'duplicate',
              }).toString();
              navigate(`/new-report?${queryParams}`);
            }}
            onDelete={(reportId) => {
              const rep = reports.find((r) => r.id === reportId);
              if (rep) {
                setSelectedReport(rep);
                setShowDeleteModal(true);
              }
            }}
          />

          <div className={styles.pagination}>
            <div className={styles.pageSizeSelector}>
              <label htmlFor="pageSize">Počet záznamů</label>
              <input
                id="pageSize"
                type="number"
                min="1"
                max="1000"
                step="5"
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              />
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={pagination?.last_page || 1}
              onPageChange={handlePageChange}
            />
            <span className={styles.totalNumber}>
              Zobrazeno {Math.min((currentPage - 1) * pageSize + 1, pagination?.total || 0)} až{' '}
              {Math.min(currentPage * pageSize, pagination?.total || 0)} z celkem{' '}
              {pagination?.total || 0} záznamů
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyReports;
