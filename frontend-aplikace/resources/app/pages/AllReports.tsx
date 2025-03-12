import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

dayjs.extend(isSameOrBefore);

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFilter,
  faSearch,
  faClose,
  faFileExport,
  faChevronLeft,
  faChevronRight,
  faSort,
  faCheck,
  faChevronDown,
  faRotate,
  faArrowUpWideShort,
  faArrowDownShortWide,
  faFolderOpen,
} from '@fortawesome/free-solid-svg-icons';

import { SortingState, ColumnOrderState } from '@tanstack/react-table';

import Menu from '@/components/Menu';
import Header from '@/components/Header';
import InputGroup from '@/components/InputGroup';
import Button from '@/components/Button';
import Pagination from '@/components/Pagination';
import Loader from '@/components/Loader';
import AlertModal from '@/components/AlertModal';
import MyDatePicker from '@/components/MyDatePicker';
import AllReportCards from '@/components/AllReportCards';
import AllReportsTable from '@/components/AllReportsTable';

import { useUsersContext } from '@/providers/UserProvider';
import { useReportContext, Report } from '@/providers/ReportProvider';
import { useAuthContext } from '@/providers/AuthProvider';
import { useClientContext } from '@/providers/ClientsProvider';
import { useTasksContext, Task } from '@/providers/TaskProvider';
import { useMessage } from '@/providers/MessageProvider';
import { useNavigate } from 'react-router-dom';

import styles from './AllReports.module.scss';

const AllReports: React.FC = () => {
  // data z kontextu pro výkazy
  const {
    reports,
    loading,
    error,
    pagination,
    totalHours,
    averageHours,
    fetchReports,
    deleteReport,
    approveReports,
    exportReports,
  } = useReportContext();

  const { user } = useAuthContext();
  const { clients, fetchClients } = useClientContext();
  const { fetchTasks, fetchActiveTasks, fetchTasksByCompany } = useTasksContext();
  const { showMessage, hideMessage, updateMessage } = useMessage();
  const { users, fetchUsers } = useUsersContext();
  const navigate = useNavigate();

  // Délka expirace aplikovaných filtrů v localStorage
  const FILTERS_MAX_AGE = 1 * 60 * 60 * 1000; // 1 hodina uložení filtrů

  // uložení filtrů do localStorage
  function saveAllReportsFilters(filters: any) {
    const data = {
      filters,
      timestamp: Date.now(),
    };
    localStorage.setItem('allReportsFilters', JSON.stringify(data));
  }

  // Načtení filtrů z localStorage
  function loadAllReportsFilters() {
    const raw = localStorage.getItem('allReportsFilters');
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      if (parsed.timestamp && parsed.timestamp + FILTERS_MAX_AGE > Date.now()) {
        return parsed.filters;
      } else {
        localStorage.removeItem('allReportsFilters');
        return {};
      }
    } catch (err) {
      console.error('Chyba při načítání filtrů:', err);
      return {};
    }
  }

  const savedFilters = loadAllReportsFilters();

  // stavy a proměnné komponenty
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [currentPage, setCurrentPage] = useState(savedFilters.currentPage || 1);
  const [pageSize, setPageSize] = useState(savedFilters.pageSize || 10);
  const [sorting, setSorting] = useState<SortingState>(
    savedFilters.sorting || [{ id: 'date', desc: true }],
  );

  // Defaultní pořadí sloupců v tabulce
  const defaultColumnOrder = [
    'date',
    'user_name',
    'client_name',
    'task_name',
    'summary',
    'job_title_name',
    'length',
    'approved',
    'actions',
  ];
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(() => {
    const storedOrder = localStorage.getItem('allReportsColumnOrder');
    return storedOrder ? JSON.parse(storedOrder) : defaultColumnOrder;
  });

  // Filtry
  const [filterUnknown, setFilterUnknown] = useState(savedFilters.filterUnknown || false);
  const [filterMyTeam, setFilterMyTeam] = useState(savedFilters.filterMyTeam || false);
  const [filterApproved, setFilterApproved] = useState(savedFilters.filterApproved || '');
  const [dateFrom, setDateFrom] = useState(
    savedFilters.dateFrom ? new Date(savedFilters.dateFrom) : null,
  );
  const [dateTo, setDateTo] = useState(savedFilters.dateTo ? new Date(savedFilters.dateTo) : null);
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [globalFilter, setGlobalFilter] = useState(savedFilters.globalFilter || '');
  const [filterUser, setFilterUser] = useState(savedFilters.filterUser || '');
  const [filterClient, setFilterClient] = useState(savedFilters.filterClient || '');
  const [filterTask, setFilterTask] = useState(savedFilters.filterTask || '');
  const [showAllTasks, setShowAllTasks] = useState(savedFilters.showAllTasks || false);

  // Výběr řádků pro hromadné schvalování
  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({});
  const [selectionMessageId, setSelectionMessageId] = useState<number | null>(null);

  // Modály pro schvalování a mazání
  const [showApproveModal, setShowApproveModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  // Zobrazení pokročilých filtrů
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(() => {
    return !!(
      savedFilters.dateFrom ||
      savedFilters.dateTo ||
      savedFilters.filterUser ||
      savedFilters.filterClient ||
      savedFilters.filterTask
    );
  });
  const [showAdvancedFiltersMobile, setShowAdvancedFiltersMobile] = useState(() => {
    return !!(
      savedFilters.dateFrom ||
      savedFilters.dateTo ||
      savedFilters.globalFilter ||
      savedFilters.filterUser ||
      savedFilters.filterClient ||
      savedFilters.filterTask ||
      savedFilters.showAllTasks
    );
  });

  // Seznam úkolů pro vybraného klienta
  const [selectTasks, setSelectTasks] = useState<Task[]>([]);

  // Načtení dat při mountu
  useEffect(() => {
    const fetchAllUsers = async () => {
      await fetchUsers(1, 10, {}, undefined, true);
    };
    fetchAllUsers();
    fetchTasks();
    fetchActiveTasks();
    fetchClients();
  }, [fetchUsers, fetchTasks, fetchActiveTasks, fetchClients]);

  // Načtení úkolů pro konkrétního klienta
  useEffect(() => {
    (async () => {
      if (filterClient) {
        const tasksForClient = await fetchTasksByCompany(filterClient, showAllTasks);
        setSelectTasks(tasksForClient);
      } else {
        setSelectTasks([]);
      }
    })();
  }, [filterClient, showAllTasks, fetchTasksByCompany]);

  // Převedení datumu z Date do stringu pro filtry
  useEffect(() => {
    setFilterDateFrom(dateFrom ? dayjs(dateFrom).format('YYYY-MM-DD') : '');
  }, [dateFrom]);
  useEffect(() => {
    setFilterDateTo(dateTo ? dayjs(dateTo).format('YYYY-MM-DD') : '');
  }, [dateTo]);

  // Ukládání filtrů při změně
  useEffect(() => {
    const filtersToSave = {
      currentPage,
      pageSize,
      sorting,
      filterUnknown,
      filterMyTeam,
      filterApproved,
      dateFrom: dateFrom ? dayjs(dateFrom).format('YYYY-MM-DD') : null,
      dateTo: dateTo ? dayjs(dateTo).format('YYYY-MM-DD') : null,
      globalFilter,
      filterUser,
      filterClient,
      filterTask,
      showAllTasks,
    };
    saveAllReportsFilters(filtersToSave);
  }, [
    currentPage,
    pageSize,
    sorting,
    filterUnknown,
    filterMyTeam,
    filterApproved,
    dateFrom,
    dateTo,
    globalFilter,
    filterUser,
    filterClient,
    filterTask,
    showAllTasks,
  ]);

  // Funkce pro získání aktuálně aplikovaných filtrů
  function getCurrentFilters() {
    const filters: Record<string, any> = {};

    if (user?.role.id === 2) {
      filters.team_only = 'true';
    }
    if (filterUnknown) {
      filters.is_unknown = 'true';
    }
    if (filterApproved !== '') {
      filters.status = filterApproved === '1' ? 'approved' : 'pending';
    }
    if (filterMyTeam) {
      filters.team_only = 'true';
    }
    if (filterDateFrom) {
      filters.date_from = filterDateFrom;
    }
    if (filterDateTo) {
      filters.date_to = filterDateTo;
    }
    if (filterUser && user?.role.id !== 2) {
      filters.user = filterUser;
    }
    if (filterClient) {
      filters.client = filterClient;
    }
    if (filterTask) {
      filters.task = filterTask;
    }
    if (globalFilter) {
      filters.search = globalFilter;
    }

    const sortToUse = sorting.length
      ? sorting
      : [{ id: 'date', desc: true } as { id: string; desc: boolean }];

    if (sortToUse.length > 0) {
      filters.sortBy = sortToUse.map((s) => s.id).join(',');
      filters.sortDir = sortToUse.map((s) => (s.desc ? 'desc' : 'asc')).join(',');
    }

    return filters;
  }

  // Načtení výkazů při změně filtrů nebo stránky
  useEffect(() => {
    let isLatest = true;
    (async () => {
      const filters = getCurrentFilters();
      await fetchReports(currentPage, pageSize, filters);
      if (!isLatest) return;
    })();

    return () => {
      isLatest = false;
    };
  }, [
    currentPage,
    pageSize,
    filterUnknown,
    filterMyTeam,
    filterApproved,
    filterDateFrom,
    filterDateTo,
    filterUser,
    filterClient,
    filterTask,
    globalFilter,
    showAllTasks,
    sorting,
    user?.role.id,
    fetchReports,
  ]);

  // Reset stránkování při změně filtr
  useEffect(() => {
    if (isFirstLoad) {
      setIsFirstLoad(false);
      return;
    }
    setCurrentPage(1);
  }, [
    filterUnknown,
    filterMyTeam,
    filterApproved,
    dateFrom,
    dateTo,
    filterUser,
    filterClient,
    filterTask,
    globalFilter,
    showAllTasks,
  ]);

  // Ulžení pořadí sloupců do localStorage
  useEffect(() => {
    localStorage.setItem('allReportsColumnOrder', JSON.stringify(columnOrder));
  }, [columnOrder]);

  // Změna stránky v paginaci
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  // Změna velikosti stránky
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  // Reset filtrů
  const handleResetFilters = () => {
    setDateFrom(null);
    setDateTo(null);
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterUser('');
    setFilterClient('');
    setFilterTask('');
    setShowAllTasks(false);
    localStorage.removeItem('allReportsFilters');
  };

  // Aktualizace dat (Sync)
  const handleSync = async () => {
    await fetchReports(currentPage, pageSize, getCurrentFilters());
  };

  // Checkbox pro schválení výkazu
  const handleSelectRow = (id: string) => {
    setSelectedRows((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Schválení vybraných výkazů
  const handleApproveSelected = () => {
    const selectedArray = Object.keys(selectedRows).filter((id) => selectedRows[id]);
    if (selectedArray.length === 0) {
      showMessage('Nejdříve vyberte alespoň jeden výkaz.', 'warning');
      return;
    }
    setShowApproveModal(true);
  };

  // Potvrzení schválení vybraných výkazů
  const confirmApproveSelected = async () => {
    const selectedArray = Object.keys(selectedRows).filter((id) => selectedRows[id]);
    try {
      await approveReports(selectedArray);
      setSelectedRows({});
      setShowApproveModal(false);
      await fetchReports(currentPage, pageSize, getCurrentFilters());
      showMessage('Vybrané výkazy byly úspěšně schváleny.', 'success');
    } catch {
      showMessage('Nepodařilo se schválit vybrané výkazy.', 'error');
    }
  };

  // Schválení konkrétního výkazu
  const handleApproveSingle = async (reportId: string, reportSummary: string) => {
    try {
      await approveReports([reportId]);
      await fetchReports(currentPage, pageSize, getCurrentFilters());
      showMessage(`Výkaz "${reportSummary}" byl schválen.`, 'success');
    } catch {
      showMessage(`Nepodařilo se schválit výkaz "${reportSummary}".`, 'error');
    }
  };

  // Hromadné označení všech výkazů na stránce
  const handleSelectAllRows = (checked: boolean, currentPageRows: string[]) => {
    setSelectedRows((prev) => {
      const updated = { ...prev };
      currentPageRows.forEach((id) => {
        updated[id] = checked;
      });
      return updated;
    });
  };

  // Počet vybraných výkazů
  useEffect(() => {
    const count = Object.keys(selectedRows).filter((key) => selectedRows[key]).length;
    if (count > 0) {
      if (selectionMessageId) {
        updateMessage(selectionMessageId, `Vybráno výkazů: ${count}`);
      } else {
        const newId = showMessage(`Vybráno výkazů: ${count}`, 'info', false);
        setSelectionMessageId(newId);
      }
    } else {
      if (selectionMessageId) {
        hideMessage(selectionMessageId);
        setSelectionMessageId(null);
      }
    }
  }, [selectedRows, selectionMessageId, showMessage, hideMessage, updateMessage]);

  // Ošetření změny data "od"
  const handleDateFromChange = (newDate: Date | null) => {
    setDateFrom(newDate);
    if (newDate && dateTo && dayjs(newDate).isAfter(dayjs(dateTo))) {
      setDateTo(newDate);
    }
  };

  // Ošetření změny data "do"
  const handleDateToChange = (newDate: Date | null) => {
    setDateTo(newDate);
    if (newDate && dateFrom && dayjs(newDate).isBefore(dayjs(dateFrom))) {
      setDateFrom(newDate);
    }
  };

  // Export výkazů odrážející aktuální filtry
  const handleExport = async () => {
    const filters = getCurrentFilters();
    try {
      const url = await exportReports(filters);
      if (url) {
        window.open(url, '_blank');
      } else {
        showMessage('Export se nezdařil – nevrátil se platný odkaz.', 'error');
      }
    } catch {
      showMessage('Export se nezdařil.', 'error');
    }
  };

  // Modál pro smazání výkazu
  const handleDeleteReport = (report: Report) => {
    setSelectedReport(report);
    setShowDeleteModal(true);
  };

  // Potvrzení smazání výkazu
  const confirmDelete = async () => {
    if (!selectedReport) return;
    try {
      await deleteReport(selectedReport.id);
      const reportName = selectedReport.summary || 'Výkaz';
      setShowDeleteModal(false);
      setSelectedReport(null);

      await fetchReports(currentPage, pageSize, getCurrentFilters());
      showMessage(`Výkaz "${reportName}" byl úspěšně smazán.`, 'success');
    } catch {
      showMessage('Nepodařilo se smazat výkaz.', 'error');
    }
  };

  // Defaultní řazení
  const [selectedSort, setSelectedSort] = useState<{ value: string; label: string } | null>(null);

  const displayedTotal = totalHours ?? 0;
  const displayedAverage = averageHours ?? 0;

  return (
    <div className={styles.layoutContainer}>
      <Menu activeItem="/all-reports" />
      <div className={styles.contentContainer}>
        <Header
          icon={faFolderOpen}
          title={user?.role.id === 2 ? 'Výkazy týmu' : 'Všechny výkazy'}
          backButton={{ link: '/more', showOn: 'mobile' }}
        />

        <div className={styles.content}>
          {showApproveModal && (
            <AlertModal
              title="Schválit vybrané výkazy"
              message={`Opravdu chcete schválit ${
                Object.keys(selectedRows).filter((id) => selectedRows[id]).length
              } vybraných výkazů?`}
              onConfirm={confirmApproveSelected}
              onCancel={() => setShowApproveModal(false)}
            />
          )}

          <div className={styles.mobileFilters}>
            <div className={styles.mobileFilterRow}>
              <Button onClick={handleApproveSelected} className={styles.massApproveButton}>
                <FontAwesomeIcon icon={faCheck} /> Hromadně schválit vybrané
              </Button>

              <div className={styles.rowContainer}>
                <div className={styles.checkboxes}>
                  {user?.role.id === 1 && (
                    <label className={styles.checkbox}>
                      <input
                        type="checkbox"
                        checked={filterMyTeam}
                        onChange={(e) => setFilterMyTeam(e.target.checked)}
                      />
                      Můj tým
                    </label>
                  )}
                  <label className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={filterUnknown}
                      onChange={(e) => setFilterUnknown(e.target.checked)}
                    />
                    Výkazy bez OP
                  </label>

                  <label htmlFor="filterApprovedCheckboxMobile" className={styles.checkbox}>
                    <input
                      type="checkbox"
                      id="filterApprovedCheckboxMobile"
                      checked={filterApproved === '0'}
                      onChange={(e) => setFilterApproved(e.target.checked ? '0' : '')}
                    />
                    Ke schválení
                  </label>
                </div>

                <div className={styles.columnContainer}>
                  <span className={styles.totalTime}>
                    <div>
                      <span className={styles.averageIcon}>Ø</span> {displayedAverage.toFixed(2)} h
                    </div>
                    <div>
                      <span className={styles.sumIcon}>∑</span> {displayedTotal.toFixed(2)} h
                    </div>
                  </span>
                  <div className={styles.buttonContainer}>
                    <Button
                      onClick={() => {
                        if (showAdvancedFiltersMobile) {
                          handleResetFilters();
                          setGlobalFilter('');
                        }
                        setShowAdvancedFiltersMobile((prev) => !prev);
                      }}
                      className={
                        showAdvancedFiltersMobile
                          ? `${styles.filterToggle} ${styles.activeToggle}`
                          : styles.filterToggle
                      }
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
              </div>

              <span className={styles.divider}></span>

              <div
                className={`${styles.advancedFiltersMobile} ${
                  showAdvancedFiltersMobile ? styles.visible : styles.hidden
                }`}
              >
                <div className={styles.filtersRow}>
                  <div className={styles.searchContainer}>
                    <InputGroup
                      id="searchInputMobile"
                      searchInput
                      icon={faSearch}
                      value={globalFilter}
                      onChange={(e) => setGlobalFilter(e.target.value)}
                      placeholder="Hledat..."
                      size="small"
                    />
                  </div>
                </div>

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

                <div className={styles.filtersRow}>
                  <div className={styles.userSelectContainer}>
                    <InputGroup
                      id="userSelect"
                      isSelect
                      size="small"
                      selectOptions={[
                        { value: '', label: 'Všichni uživatelé' },
                        ...users.map((usr) => ({
                          value: usr.id.toString(),
                          label: usr.name,
                        })),
                      ]}
                      value={
                        filterUser
                          ? {
                              value: filterUser,
                              label:
                                users.find((u) => u.id.toString() === filterUser)?.name ||
                                'Neznámý uživatel',
                            }
                          : { value: '', label: 'Všichni uživatelé' }
                      }
                      onSelectChange={(selected) => setFilterUser(selected?.value || '')}
                    />
                  </div>
                </div>

                <div className={styles.clientSelectContainer}>
                  <InputGroup
                    id="clientSelectMobile"
                    isSelect
                    size="small"
                    selectOptions={[
                      { value: '', label: 'Všichni klienti' },
                      ...clients.map((c) => ({
                        value: c.id.toString(),
                        label: c.name,
                      })),
                    ]}
                    value={
                      filterClient
                        ? {
                            value: filterClient,
                            label:
                              clients.find((cl) => cl.id.toString() === filterClient)?.name ||
                              'Neznámý klient',
                          }
                        : { value: '', label: 'Všichni klienti' }
                    }
                    onSelectChange={(selected) => {
                      setFilterClient(selected?.value || '');
                      setFilterTask('');
                    }}
                  />
                </div>

                {filterClient && (
                  <div className={styles.taskSelectContainer}>
                    <InputGroup
                      id="taskSelectMobile"
                      isSelect
                      className={styles.inputGroup}
                      size="small"
                      selectOptions={[
                        { value: '', label: 'Všechny úkoly' },
                        ...selectTasks.map((t) => ({
                          value: t.code,
                          label: t.name,
                        })),
                      ]}
                      value={
                        filterTask
                          ? {
                              value: filterTask,
                              label: selectTasks.find((x) => x.code === filterTask)?.name || '',
                            }
                          : { value: '', label: 'Všechny úkoly' }
                      }
                      onSelectChange={(selected) => setFilterTask(selected?.value || '')}
                      disabled={!filterClient}
                    />
                    <label className={filterClient ? styles.checkbox : styles.checkboxDisabled}>
                      <input
                        type="checkbox"
                        checked={showAllTasks}
                        onChange={(e) => setShowAllTasks(e.target.checked)}
                        disabled={!filterClient}
                      />
                      Zobrazit všechny úkoly
                    </label>
                  </div>
                )}

                {(filterDateFrom ||
                  globalFilter ||
                  filterDateTo ||
                  filterClient ||
                  filterUser ||
                  filterTask ||
                  showAllTasks) && (
                  <Button onClick={handleResetFilters} className={styles.deleteFiltersButton}>
                    <FontAwesomeIcon icon={faClose} /> Smazat filtry
                  </Button>
                )}
                <span className={styles.divider}></span>
              </div>
            </div>

            <div className={styles.sortContainer}>
              <div className={styles.row}>
                <div className={styles.sortSelect}>
                  <label htmlFor="sortSelectMobile">Řadit podle</label>
                  <div className={styles.selectWrapper}>
                    <select
                      id="sortSelectMobile"
                      value={selectedSort?.value || 'date'}
                      onChange={(e) => {
                        const selectedValue = e.target.value;
                        const options = [
                          { value: 'date', label: 'Datum' },
                          { value: 'user_name', label: 'Uživatel' },
                          { value: 'client_name', label: 'Klient' },
                          { value: 'task_name', label: 'Úkol' },
                          { value: 'summary', label: 'Popis' },
                          { value: 'job_title_name', label: 'Role' },
                          { value: 'length', label: 'Čas' },
                          { value: 'approved', label: 'Schváleno' },
                        ];
                        const selectedOption = options.find(
                          (option) => option.value === selectedValue,
                        );
                        if (selectedOption) {
                          setSelectedSort(selectedOption);
                          setSorting([{ id: selectedOption.value, desc: false }]);
                        }
                      }}
                    >
                      <option value="date">Datum</option>
                      <option value="user_name">Uživatel</option>
                      <option value="client_name">Klient</option>
                      <option value="task_name">Úkol</option>
                      <option value="summary">Popis</option>
                      <option value="job_title_name">Role</option>
                      <option value="length">Čas</option>
                      <option value="approved">Schváleno</option>
                    </select>
                    <FontAwesomeIcon icon={faChevronDown} className={styles.icon} />
                  </div>
                </div>

                <Button
                  className={styles.sortOrderButton}
                  onClick={() => {
                    if (!selectedSort) {
                      setSorting([{ id: 'date', desc: !sorting[0]?.desc }]);
                      setSelectedSort({ value: 'date', label: 'Datum' });
                    } else {
                      setSorting([
                        {
                          id: selectedSort.value,
                          desc: sorting[0]?.id === selectedSort.value ? !sorting[0].desc : true,
                        },
                      ]);
                    }
                  }}
                >
                  <FontAwesomeIcon
                    icon={sorting[0]?.desc ? faArrowDownShortWide : faArrowUpWideShort}
                  />
                </Button>

                <div className={styles.pageSizeSelector}>
                  <select
                    id="pageSizeMobile"
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
          </div>

          <div className={styles.filters}>
            <div className={styles.contentLeft}>
              <Button onClick={handleApproveSelected} className={styles.massApproveButton}>
                <FontAwesomeIcon icon={faCheck} /> Hromadně schválit vybrané
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

              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={filterUnknown}
                  onChange={(e) => setFilterUnknown(e.target.checked)}
                />
                Výkazy bez OP
              </label>
              {user?.role.id === 1 && (
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={filterMyTeam}
                    onChange={(e) => setFilterMyTeam(e.target.checked)}
                  />
                  Můj tým
                </label>
              )}

              <label htmlFor="filterApprovedCheckbox" className={styles.checkbox}>
                <input
                  type="checkbox"
                  id="filterApprovedCheckbox"
                  checked={filterApproved === '0'}
                  onChange={(e) => setFilterApproved(e.target.checked ? '0' : '')}
                />
                Ke schválení
              </label>
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
              <div className={styles.searchContainer}>
                <InputGroup
                  id="searchInput"
                  searchInput
                  icon={faSearch}
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  placeholder="Hledat..."
                />
              </div>
              <Button onClick={handleSync} className={styles.resetButton}>
                <FontAwesomeIcon icon={faRotate} /> Sync
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

            <div className={styles.userSelectContainer}>
              <InputGroup
                id="userSelectDesktop"
                isSelect
                size="small"
                selectOptions={[
                  { value: '', label: 'Všichni uživatelé' },
                  ...users.map((usr) => ({
                    value: usr.id.toString(),
                    label: usr.name,
                  })),
                ]}
                value={
                  filterUser
                    ? {
                        value: filterUser,
                        label:
                          users.find((u) => u.id.toString() === filterUser)?.name ||
                          'Neznámý uživatel',
                      }
                    : { value: '', label: 'Všichni uživatelé' }
                }
                onSelectChange={(selected) => setFilterUser(selected?.value || '')}
              />
            </div>

            <div className={styles.selectFilters}>
              <div className={styles.clientSelectContainer}>
                <InputGroup
                  id="clientSelectDesktop"
                  isSelect
                  size="small"
                  selectOptions={[
                    { value: '', label: 'Všichni klienti' },
                    ...clients.map((c) => ({
                      value: c.id.toString(),
                      label: c.name,
                    })),
                  ]}
                  value={
                    filterClient
                      ? {
                          value: filterClient,
                          label:
                            clients.find((cl) => cl.id.toString() === filterClient)?.name || '',
                        }
                      : { value: '', label: 'Všichni klienti' }
                  }
                  onSelectChange={(selected) => {
                    setFilterClient(selected?.value || '');
                    setFilterTask('');
                  }}
                />
              </div>

              {filterClient && (
                <div className={styles.taskSelectContainer}>
                  <InputGroup
                    id="taskSelectDesktop"
                    isSelect
                    size="small"
                    selectOptions={[
                      { value: '', label: 'Všechny úkoly' },
                      ...selectTasks.map((t) => ({
                        value: t.code,
                        label: t.name,
                      })),
                    ]}
                    value={
                      filterTask
                        ? {
                            value: filterTask,
                            label: selectTasks.find((x) => x.code === filterTask)?.name || '',
                          }
                        : { value: '', label: 'Všechny úkoly' }
                    }
                    onSelectChange={(selected) => setFilterTask(selected?.value || '')}
                    disabled={!filterClient}
                  />

                  <label className={filterClient ? styles.checkbox : styles.checkboxDisabled}>
                    <input
                      type="checkbox"
                      checked={showAllTasks}
                      onChange={(e) => setShowAllTasks(e.target.checked)}
                      disabled={!filterClient}
                    />
                    Zobrazit všechny úkoly
                  </label>
                </div>
              )}
            </div>

            {(filterDateFrom ||
              filterDateTo ||
              filterClient ||
              filterUser ||
              filterTask ||
              showAllTasks) && (
              <Button onClick={handleResetFilters} className={styles.deleteFiltersButton}>
                <FontAwesomeIcon icon={faClose} /> Smazat filtry
              </Button>
            )}

            <div className={styles.exportButtonRow}>
              <Button onClick={handleExport} className={styles.exportButton}>
                <FontAwesomeIcon icon={faFileExport} /> Export
              </Button>
            </div>
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
            {loading ? (
              <div className={styles.loaderContainer}>
                <Loader isContentOnly />
              </div>
            ) : (
              <AllReportCards
                reports={reports}
                isLoading={loading}
                onEdit={(reportId) =>
                  navigate(`/edit-report/${reportId}`, { state: { from: '/all-reports' } })
                }
                onDelete={(report) => handleDeleteReport(report)}
                selectedRows={selectedRows}
                onToggleSelect={handleSelectRow}
                onToggleSelectAll={handleSelectAllRows}
                onApproveSingle={handleApproveSingle}
              />
            )}
          </div>

          <AllReportsTable
            data={reports}
            loading={loading}
            error={error}
            sorting={sorting}
            onSortingChange={setSorting}
            columnOrder={columnOrder}
            onColumnOrderChange={setColumnOrder}
            selectedRows={selectedRows}
            onToggleRow={handleSelectRow}
            onToggleSelectAll={handleSelectAllRows}
            onApproveSingle={handleApproveSingle}
            onEditReport={(reportId) =>
              navigate(`/edit-report/${reportId}`, { state: { from: '/all-reports' } })
            }
            onDeleteReport={handleDeleteReport}
          />

          <div className={styles.pagination}>
            <InputGroup
              id="pageSize"
              label=""
              isSelect={true}
              className={styles.pageSizeSelector}
              selectOptions={[10, 25, 50, 75, 100, 200, 500].map((size) => ({
                value: size.toString(),
                label: size.toString(),
              }))}
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

export default AllReports;
