import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isoWeek from 'dayjs/plugin/isoWeek';

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
import MyReportsTable from '@/components/MyReportsTable';

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
import styles from './MyReports.module.scss';

dayjs.extend(isSameOrBefore);
dayjs.extend(isoWeek);

interface ReportData extends Report {}

const MyReports: React.FC = () => {
  // Expirační doba pro uložené filtry v localStorage
  const FILTERS_MAX_AGE = 1 * 60 * 60 * 1000;

  // Funkce pro ukládání filtrů z localStorage
  function saveMyReportsFilters(filters: any) {
    const data = {
      filters,
      timestamp: Date.now(),
    };
    localStorage.setItem('myReportsFilters', JSON.stringify(data));
  }

  // Funkce pro načítání filtrů z localStorage
  function loadMyReportsFilters() {
    const raw = localStorage.getItem('myReportsFilters');
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw);
      const now = Date.now();
      if (!(parsed.timestamp && parsed.timestamp + FILTERS_MAX_AGE > now)) {
        localStorage.removeItem('myReportsFilters');
        return null;
      } else {
        return parsed.filters;
      }
    } catch (err) {
      console.error('Chyba při načítání filtrů z localStorage:', err);
      return null;
    }
  }

  // Funkce a stavy z kontextů
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

  // Navigace a stavy pro stránkování
  const navigate = useNavigate();
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [selectedReport, setSelectedReport] = useState<ReportData | null>(null);

  // Stavy pro stránkování, řazení a sloupce
  const [currentPage, setCurrentPage] = useState(() => {
    const savedFilters = loadMyReportsFilters() || {};
    return savedFilters.currentPage || 1;
  });
  const [pageSize, setPageSize] = useState(() => {
    const savedFilters = loadMyReportsFilters() || {};
    return savedFilters.pageSize || 10;
  });
  const [isPageSizeManuallySet, setIsPageSizeManuallySet] = useState(false);

  const defaultColumnOrder = [
    'date',
    'client_name',
    'task_name',
    'summary',
    'length',
    'job_title_name',
    'actions',
  ];
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('myReportsColumnOrder');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed && parsed.length ? parsed : defaultColumnOrder;
      } catch (err) {
        console.error('Chyba při načítání columnOrder:', err);
      }
    }
    return defaultColumnOrder;
  });

  const [sorting, setSorting] = useState<SortingState>(() => {
    const savedFilters = loadMyReportsFilters() || {};
    return savedFilters.sorting || [{ id: 'date', desc: true }];
  });

  // Filtry
  const [globalFilter, setGlobalFilter] = useState(() => {
    const savedFilters = loadMyReportsFilters() || {};
    return savedFilters.globalFilter || '';
  });
  const [filterClient, setFilterClient] = useState(() => {
    const savedFilters = loadMyReportsFilters() || {};
    return savedFilters.filterClient || '';
  });
  const [filterTask, setFilterTask] = useState(() => {
    const savedFilters = loadMyReportsFilters() || {};
    return savedFilters.filterTask || '';
  });
  const [showAllTasks, setShowAllTasks] = useState<boolean>(() => {
    const savedFilters = loadMyReportsFilters() || {};
    if (savedFilters.showAllTasks !== undefined) {
      return savedFilters.showAllTasks;
    }
    return user?.show_all_tasks || false;
  });
  const [dateFrom, setDateFrom] = useState<Date | null>(() => {
    const savedFilters = loadMyReportsFilters() || {};
    return savedFilters.dateFrom ? new Date(savedFilters.dateFrom) : null;
  });
  const [dateTo, setDateTo] = useState<Date | null>(() => {
    const savedFilters = loadMyReportsFilters() || {};
    return savedFilters.dateTo ? new Date(savedFilters.dateTo) : null;
  });
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [activeRange, setActiveRange] = useState<'' | 'today' | 'thisWeek' | 'thisMonth'>(() => {
    const savedFilters = loadMyReportsFilters() || {};
    return savedFilters.activeRange || '';
  });

  // Zobrazení "Pokročilých filtrů"
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(() => {
    const savedFilters = loadMyReportsFilters() || {};
    return !!(
      savedFilters.dateFrom ||
      savedFilters.dateTo ||
      savedFilters.filterClient ||
      savedFilters.filterTask ||
      savedFilters.showAllTasks
    );
  });
  const [showAdvancedFiltersMobile, setShowAdvancedFiltersMobile] = useState<boolean>(() => {
    const savedFilters = loadMyReportsFilters() || {};
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

  // Ukládání filtrů do localStorage při změně
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
    saveMyReportsFilters(filtersToSave);
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

  // Načtení uživatelova obsahu při prvním renderu
  useEffect(() => {
    if (user) {
      (async () => {
        await Promise.all([fetchTasks(), fetchActiveTasks(), fetchClients()]);
      })();
    }
  }, [user, fetchTasks, fetchActiveTasks, fetchClients]);

  // Načtení úkolů pro vybraného klienta
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

  // Načtení pořadí sloupců
  useEffect(() => {
    const saved = localStorage.getItem('myReportsColumnOrder');
    if (saved) {
      try {
        setColumnOrder(JSON.parse(saved));
      } catch {}
    }
  }, []);

  // Uložení pořadí sloupců do localStorage při změně
  useEffect(() => {
    localStorage.setItem('myReportsColumnOrder', JSON.stringify(columnOrder));
  }, [columnOrder]);

  // Přepínání zobrazení všech úkolů
  const handleTaskFilterChange = () => {
    const options = showAllTasks ? tasks : activeTasks;
    setSelectTasks(options);
  };

  const pageSizeOptions = [10, 25, 50, 75, 100, 200, 500].map((size) => ({
    value: size.toString(),
    label: size.toString(),
  }));

  useEffect(() => {
    handleTaskFilterChange();
  }, [showAllTasks, tasks, activeTasks]);

  useEffect(() => {
    setFilterDateFrom(dateFrom ? dayjs(dateFrom).format('YYYY-MM-DD') : '');
  }, [dateFrom]);
  useEffect(() => {
    setFilterDateTo(dateTo ? dayjs(dateTo).format('YYYY-MM-DD') : '');
  }, [dateTo]);

  // Reset filtrů
  const handleResetFilters = async () => {
    setDateFrom(null);
    setDateTo(null);
    setFilterClient('');
    setActiveRange('');
    setFilterTask('');
    handleTaskFilterChange();
    setShowAllTasks(user ? user.show_all_tasks : false);
    setSelectTasks([]);
  };

  // Sync dat
  const handleSync = async () => {
    await fetchMyReports(currentPage, pageSize, getCurrentFilters());
  };

  // Přednastavené rozsahy datumů
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

  // Kontrola validních datumů
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

  // Získání aktuálně aplikovaných filtrů
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

  // Funkce pro načtení výkazů odrážející aktuální filtry
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

  // Změna stránky
  const handlePageChange = async (newPage: number) => {
    setCurrentPage(newPage);
    loadReports(newPage);
  };

  // Změna počtu výkazů na stránku
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setIsPageSizeManuallySet(true);
    setCurrentPage(1);
  };

  // Export výkazů odrážející aplikované filtry
  const handleExport = async () => {
    if (!user) return;
    const filters = getCurrentFilters();
    filters.user = user.id;
    const url = await exportReports(filters);
    if (url) {
      window.open(url, '_blank');
    }
  };

  // Potvrzení smazání výkazu
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
          {/* Základní filtry (desktop) */}
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
                onClick={() => {
                  if (showAdvancedFilters) {
                    handleResetFilters();
                  }
                  setShowAdvancedFilters((prev) => !prev);
                }}
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
              <Button onClick={handleSync} className={styles.resetButton}>
                <FontAwesomeIcon icon={faRotate} /> Sync
              </Button>
            </div>
          </div>

          {/* Pokročilé filtry (desktop) */}
          <div className={`${styles.advancedFilters} ${showAdvancedFilters ? styles.isOpen : ''}`}>
            <div className={styles.datepickerRow}>
              <div className={styles.datepickerContainer}>
                <label>Datum OD</label>
                <button
                  type="button"
                  className={styles.navButtonLeft}
                  onClick={() => {
                    setDateFrom((prev) => {
                      const baseDate = prev || dayjs();
                      const newDate = dayjs(baseDate).subtract(1, 'day').toDate();
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
                  enableDragAndDrop={true}
                />

                <button
                  type="button"
                  className={styles.navButtonRight}
                  onClick={() => {
                    setDateFrom((prev) => {
                      const baseDate = prev || dayjs();
                      const newDate = dayjs(baseDate).add(1, 'day').toDate();
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
                      const baseDate = prev || dayjs();
                      const newDate = dayjs(baseDate).subtract(1, 'day').toDate();
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
                  enableDragAndDrop={true}
                />

                <button
                  type="button"
                  className={styles.navButtonRight}
                  onClick={() => {
                    setDateTo((prev) => {
                      const baseDate = prev || dayjs();
                      const newDate = dayjs(baseDate).add(1, 'day').toDate();
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

              {filterClient && (
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
              )}
            </div>

            {(user?.role.id === 1 || user?.role.id === 2) && filterClient && (
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

            {filterClient || filterTask || dateFrom || dateTo || showAllTasks ? (
              <Button onClick={handleResetFilters} className={styles.deleteFiltersButton}>
                <FontAwesomeIcon icon={faClose} /> Smazat filtry
              </Button>
            ) : null}

            <Button
              onClick={handleExport}
              className={styles.exportButton}
              style={{ alignSelf: 'flex-end' }}
            >
              <FontAwesomeIcon icon={faFileExport} /> Export
            </Button>
          </div>

          {/* Modál pro smazání výkazu */}
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

          {/* Mobilní filtry a karty výkazů */}
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
                    onClick={() => {
                      if (showAdvancedFiltersMobile) {
                        handleResetFilters();
                      }
                      setShowAdvancedFiltersMobile((prev) => !prev);
                    }}
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

                  <Button onClick={handleSync} className={styles.resetButton}>
                    <FontAwesomeIcon icon={faRotate} />
                  </Button>
                </div>
              </div>

              <span className={styles.divider}></span>

              {/* Pokročilé filtry (mobilní zařízení) */}
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
                          const baseDate = prev || dayjs();
                          const newDate = dayjs(baseDate).subtract(1, 'day').toDate();
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
                          const baseDate = prev || dayjs();
                          const newDate = dayjs(baseDate).add(1, 'day').toDate();
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
                          const baseDate = prev || dayjs();
                          const newDate = dayjs(baseDate).subtract(1, 'day').toDate();
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
                          const baseDate = prev || dayjs();
                          const newDate = dayjs(baseDate).add(1, 'day').toDate();
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

                {filterClient && (
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
                )}

                {filterClient && (
                  <div className={styles.checkboxContainer}>
                    {(user?.role.id === 1 || user?.role.id === 2) && filterClient && (
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

                    {filterClient || filterTask || dateFrom || dateTo || showAllTasks ? (
                      <Button onClick={handleResetFilters} className={styles.deleteFiltersButton}>
                        <FontAwesomeIcon icon={faClose} /> Smazat filtry
                      </Button>
                    ) : null}
                  </div>
                )}
                <span className={styles.divider}></span>
              </div>

              {/* Řazení a velikost stránky (mobilní zařízení)  */}
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

            {/* Karty výkazů (mobilní zařízení) */}
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

          {/* Tabulka pro zobrazení výkazů (desktop) */}
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

          {/* Paginace */}
          <div className={styles.pagination}>
            <InputGroup
              id="pageSize"
              label=""
              isSelect={true}
              className={styles.pageSizeSelector}
              selectOptions={pageSizeOptions}
              value={{
                value: pageSize.toString(),
                label: pageSize.toString(),
              }}
              onSelectChange={(selectedOption) => {
                if (selectedOption) {
                  const newPageSize = parseInt(selectedOption.value, 10);
                  handlePageSizeChange(newPageSize);
                }
              }}
              selectMenuPlacement="top"
              isSearchable={false}
            />
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
