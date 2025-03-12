import React, { useEffect, useRef, useState } from 'react';
import {
  createColumnHelper,
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  SortingState,
  ColumnDef,
} from '@tanstack/react-table';
import { useUsersContext } from '@/providers/UserProvider';
import { useRoles } from '@/providers/RoleProvider';
import styles from './AllUsers.module.scss';
import Menu from '@/components/Menu';
import Header from '@/components/Header';
import InputGroup from '@/components/InputGroup';
import Button from '@/components/Button';
import {
  faFilter,
  faPen,
  faSearch,
  faTrash,
  faUsers,
  faUserPlus,
  faUser,
  faEnvelope,
  faKey,
  faUserTie,
  faQuestionCircle,
  faSortUp,
  faSortDown,
  faSort,
  faChevronDown,
  faClose,
  faRotate,
  faArrowDownShortWide,
  faArrowUpWideShort,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import RoleInfo from '@/components/RoleInfo';
import JobTitle from '@/components/JobTitle';
import { CellContext } from '@tanstack/react-table';
import AlertModal from '@/components/AlertModal';
import { useMessage } from '@/providers/MessageProvider';
import Loader from '@/components/Loader';
import UserCards from '@/components/UserCards';
import { useAuthContext } from '@/providers/AuthProvider';
import { useNavigate } from 'react-router-dom';
import Pagination from '@/components/Pagination';
import { User } from '@/providers/UserProvider';

const AllUsers: React.FC = () => {
  // Délka expirace uložených filtrů
  const FILTERS_MAX_AGE = 1 * 60 * 60 * 1000; // 1 hodina ukládání filtrů

  // Uložení filtrů do localStorage
  function saveUserFilters(filters: any) {
    const data = {
      filters,
      timestamp: Date.now(),
    };
    localStorage.setItem('userFilters', JSON.stringify(data));
  }

  // Načtení filtrů z localStorage
  function loadUserFilters() {
    const raw = localStorage.getItem('userFilters');
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      if (parsed.timestamp && parsed.timestamp + FILTERS_MAX_AGE > Date.now()) {
        return parsed.filters;
      } else {
        localStorage.removeItem('userFilters');
        return {};
      }
    } catch (err) {
      console.error('Chyba při načítání filtrů:', err);
      return {};
    }
  }

  // Stavy a funkce
  const { users, pagination, fetchUsers, fetchSupervisors, deleteUser, loading } =
    useUsersContext();
  const { roles } = useRoles();
  const { showMessage } = useMessage();
  const { user } = useAuthContext();
  const navigate = useNavigate();

  // Proměnné a stavy pro filtry
  const savedFilters = loadUserFilters();
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [supervisors, setSupervisors] = useState<User[]>([]);

  // Stránkování
  const [currentPage, setCurrentPage] = useState<number>(savedFilters.currentPage || 1);
  const [pageSize, setPageSize] = useState<number>(savedFilters.pageSize || 10);
  const [isPageSizeManuallySet, setIsPageSizeManuallySet] = useState(false);

  // Základní filtry
  const [globalFilter, setGlobalFilter] = useState<string>(savedFilters.globalFilter || '');
  const [filterSupervisor, setFilterSupervisor] = useState<string>(
    savedFilters.filterSupervisor || '',
  );
  const [filterRole, setFilterRole] = useState<string>(savedFilters.filterRole || '');
  const [requiresApproval, setRequiresApproval] = useState<boolean | null>(
    savedFilters.requiresApproval ?? null,
  );

  // Řazení
  const [sorting, setSorting] = useState<SortingState>(() => {
    const sf = loadUserFilters();
    return sf.sorting || [];
  });
  const defaultColumnOrder = [
    'name',
    'email',
    'role_name',
    'supervisor',
    'job_title',
    'auto_approved',
    'actions',
  ];
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('allUsersColumnOrder');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (err) {
      console.error('Chyba při načítání allUsersColumnOrder:', err);
    }
    return defaultColumnOrder;
  });
  const [selectedSorting, setSelectedSorting] = useState({ value: 'name', label: 'Jméno' });

  // Otevření a zavření pokročilých filtrů
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(() => {
    const storedFilters = loadUserFilters();
    const hasAdvancedFilters =
      storedFilters.filterSupervisor ||
      storedFilters.filterRole ||
      storedFilters.requiresApproval !== null;
    return !!hasAdvancedFilters;
  });

  // Mazání uživatele
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: number; name: string } | null>(null);

  // Drag and drop sloupců
  const thRefs = useRef<(HTMLTableCellElement | null)[]>([]);
  const [stickyHeaders, setStickyHeaders] = useState<boolean[]>([]);

  // Ukládání filtrů do localStorage při změně
  useEffect(() => {
    const filtersToSave = {
      currentPage,
      pageSize,
      globalFilter,
      filterSupervisor,
      filterRole,
      requiresApproval,
      sorting,
    };
    saveUserFilters(filtersToSave);
  }, [
    currentPage,
    pageSize,
    globalFilter,
    filterSupervisor,
    filterRole,
    requiresApproval,
    sorting,
  ]);

  // Ukládání pořadí sloupců do localStorage při změně
  useEffect(() => {
    localStorage.setItem('allUsersColumnOrder', JSON.stringify(columnOrder));
  }, [columnOrder]);

  // Definice sloupců pro tabulku
  const columnHelper = createColumnHelper<User>();
  const columns: ColumnDef<User, any>[] = [
    columnHelper.accessor('name', {
      id: 'name',
      header: 'Jméno',
    }),
    columnHelper.accessor('email', {
      id: 'email',
      header: 'Email',
    }),
    columnHelper.accessor((row) => row.role.id, {
      id: 'role_name',
      header: 'Práva',
      cell: (info) => <RoleInfo id={info.getValue()} displayType="both" />,
    }),
    columnHelper.accessor((row) => row.supervisor?.name || '', {
      id: 'supervisor',
      header: 'Nadřízený',
    }),
    columnHelper.accessor((row) => row.job_title?.id, {
      id: 'job_title',
      header: 'Role',
      cell: (info) => <JobTitle id={info.getValue()} returnType="both" />,
    }),
    columnHelper.accessor('auto_approved', {
      id: 'auto_approved',
      header: 'Kontrola',
      cell: (info) => (info.getValue() ? 'Nevyžaduje' : 'Vyžaduje'),
    }),
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: ({ row }: CellContext<User, unknown>) => (
        <div className={styles.actionContainer}>
          <Button
            className={`${styles.actionButton} ${styles.editButton}`}
            onClick={() => navigate(`/edit-user/${row.original.id}`)}
            title="Upravit"
          >
            <FontAwesomeIcon icon={faPen} />
          </Button>
          <button
            className={`${styles.actionButton} ${styles.deleteButton}`}
            onClick={() => handleDelete(row.original.id, row.original.name)}
            title="Smazat"
          >
            <FontAwesomeIcon icon={faTrash} />
          </button>
        </div>
      ),
    },
  ];

  // Intsance tabulky
  const table = useReactTable({
    data: users,
    columns,
    manualPagination: true,
    pageCount: pagination?.last_page || 0,
    state: {
      columnOrder,
      pagination: { pageIndex: currentPage - 1, pageSize },
      sorting,
    },
    onColumnOrderChange: setColumnOrder,
    onPaginationChange: (updater) => {
      if (typeof updater === 'function') {
        const updatedPage = updater({ pageIndex: currentPage - 1, pageSize }).pageIndex + 1;
        setCurrentPage(updatedPage);
      } else {
        setCurrentPage(updater.pageIndex + 1);
      }
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  useEffect(() => {
    if (isFirstLoad) {
      setIsFirstLoad(false);
      return;
    }
    setCurrentPage(1);
  }, [globalFilter, filterSupervisor, filterRole, requiresApproval, isFirstLoad]);


  const handlePageSizeChange = (value: number) => {
    setPageSize(value);
    setIsPageSizeManuallySet(true);
    setCurrentPage(1);
  };

  // Modál pro smazání uživatele
  const handleDelete = (userId: number, userName: string) => {
    setSelectedUser({ id: userId, name: userName });
    setShowModal(true);
  };

  // Potvrzení smazání uživatele
  const confirmDelete = async () => {
    if (selectedUser !== null) {
      try {
        await deleteUser(selectedUser.id);
        setShowModal(false);
        const userName = selectedUser.name.split(' ')[0];
        showMessage('Uživatel ' + userName + ' byl úspěšně smazán.', 'success');
        const filters = getCurrentFilters();
        const sortColumns = sorting.map((s) => s.id);
        const sortOrders = sorting.map((s) => (s.desc ? 'desc' : 'asc'));
        await fetchUsers(currentPage, pageSize, filters, {
          columns: sortColumns,
          orders: sortOrders,
        });
      } catch {
        showMessage('Nastala chyba při mazání uživatele.', 'error');
      }
    }
  };

  // Sync uživatelů
  const handleSync = async () => {
    const filters = getCurrentFilters();
    const sortColumns = sorting.map((s) => s.id);
    const sortOrders = sorting.map((s) => (s.desc ? 'desc' : 'asc'));
    await fetchUsers(currentPage, pageSize, filters, {
      columns: sortColumns,
      orders: sortOrders,
    });
  };

  // Reset filtrů
  const handleResetFilter = async () => {
    setFilterSupervisor('');
    setFilterRole('');
    setRequiresApproval(null);
  };

  // Sticky headers
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
  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Změna stránky
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  // Načtení nadřízených
  useEffect(() => {
    fetchSupervisors().then(setSupervisors);
  }, [fetchSupervisors]);

  // Získání aktuálně aplikovaných filtrů
  const getCurrentFilters = () => {
    const filters: Record<string, any> = {};
    if (globalFilter) filters.search = globalFilter;
    if (filterSupervisor) filters.supervisor_id = filterSupervisor;
    if (filterRole) filters.role_id = filterRole;
    if (requiresApproval !== null) filters.auto_approved = !requiresApproval;
    return filters;
  };

  // Načtení uživatelů odrážející aktuální filtry a stránkování
  useEffect(() => {
    let isLatest = true;
    (async () => {
      try {
        const sortColumns = sorting.map((s) => s.id);
        const sortOrders = sorting.map((s) => (s.desc ? 'desc' : 'asc'));
        const filters = getCurrentFilters();
        await fetchUsers(currentPage, pageSize, filters, {
          columns: sortColumns,
          orders: sortOrders,
        });
        if (!isLatest) return;
      } finally {
      }
    })();
    return () => {
      isLatest = false;
    };
  }, [
    currentPage,
    pageSize,
    sorting,
    fetchUsers,
    globalFilter,
    filterSupervisor,
    filterRole,
    requiresApproval,
  ]);


  return (
    <div className={styles.layoutContainer}>
      <Menu activeItem="/all-users" />
      <div className={styles.contentContainer}>
        {user?.role.id === 1 ? (
          <Header
            icon={faUsers}
            title="Všichni uživatelé"
            backButton={{ link: '/more', showOn: 'mobile' }}
          />
        ) : (
          <Header icon={faUsers} title="Můj tým" backButton={{ link: '/more', showOn: 'mobile' }} />
        )}

        <div className={styles.content}>
          {/* Filtry na desktopu */}
          <div className={styles.filters}>
            <div className={styles.contentLeft}>
              <Button className={styles.newUserButton} onClick={() => navigate('/new-user')}>
                <FontAwesomeIcon icon={faUserPlus} /> Nový uživatel
              </Button>

              {user?.role.id === 1 && (
                <InputGroup
                  id="supervisorFilter"
                  className={styles.supervisorFilter}
                  isSelect
                  size="small"
                  placeholder="Vybrat nadřízeného"
                  selectOptions={[
                    { value: '', label: 'Všichni nadřízení' },
                    ...supervisors.map((sup) => ({
                      value: sup.id.toString(),
                      label: sup.name,
                    })),
                  ]}
                  value={
                    supervisors
                      .map((sup) => ({ value: sup.id.toString(), label: sup.name }))
                      .find((option) => option.value === filterSupervisor) || {
                      value: '',
                      label: 'Všichni nadřízení',
                    }
                  }
                  onSelectChange={(selected) => setFilterSupervisor(selected?.value || '')}
                />
              )}

              <InputGroup
                id="roleFilter"
                className={styles.roleFilter}
                isSelect
                size="small"
                placeholder="Vybrat oprávnění"
                selectOptions={[
                  { value: '', label: 'Všechna oprávnění' },
                  ...roles.map((role) => ({
                    value: role.id.toString(),
                    label: role.name,
                  })),
                ]}
                value={
                  roles
                    .map((role) => ({
                      value: role.id.toString(),
                      label: role.name,
                    }))
                    .find((option) => option.value === filterRole) || {
                    value: '',
                    label: 'Všechna oprávnění',
                  }
                }
                onSelectChange={(selected) => setFilterRole(selected?.value || '')}
              />

              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={requiresApproval ?? false}
                  onChange={() =>
                    setRequiresApproval((prev) => (prev === null ? true : prev ? null : false))
                  }
                />
                Vyžaduje kontrolu
              </label>
            </div>

            <div className={styles.contentRight}>
              <InputGroup
                id="searchFilter"
                searchInput
                placeholder="Hledat..."
                icon={faSearch}
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
              />
              <Button onClick={handleSync} className={styles.resetButton}>
                <FontAwesomeIcon icon={faRotate} /> Sync
              </Button>
            </div>
          </div>

          {/* Dialog pro mazání uživatele */}
          {showModal && selectedUser && (
            <AlertModal
              title="Smazat uživatele"
              message="Opravdu chcete smazat uživatele"
              userName={selectedUser.name}
              onConfirm={confirmDelete}
              onCancel={() => setShowModal(false)}
            />
          )}

          {/* Obsah pro mobilní zařízení */}
          <div className={styles.responsiveContent}>
            <div className={styles.mobileFilters}>
              <InputGroup
                id="searchFilter"
                label=""
                searchInput
                placeholder="Hledat..."
                icon={faSearch}
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
              />

              <div className={styles.buttonContainer}>
                <Button className={styles.newUserButton} onClick={() => navigate('/new-user')}>
                  <FontAwesomeIcon icon={faUserPlus} /> Nový uživatel
                </Button>

                <Button
                  onClick={() => {
                    handleResetFilter();
                    setShowAdvancedFilters((prev) => !prev);
                  }}
                  className={showAdvancedFilters ? styles.filterButtonActive : styles.filterButton}
                >
                  {showAdvancedFilters ? (
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

              <span className={styles.divider}></span>

              <div
                className={`${styles.advancedFilters} ${
                  showAdvancedFilters ? styles.visible : styles.hidden
                }`}
              >
                {user?.role.id === 1 && (
                  <InputGroup
                    id="supervisorFilter"
                    className={styles.supervisorFilter}
                    label=""
                    isSelect
                    size="small"
                    placeholder="Vybrat nadřízeného"
                    selectOptions={[
                      { value: '', label: 'Všichni nadřízení' },
                      ...supervisors.map((sup) => ({
                        value: sup.id.toString(),
                        label: sup.name,
                      })),
                    ]}
                    value={
                      supervisors
                        .map((sup) => ({ value: sup.id.toString(), label: sup.name }))
                        .find((option) => option.value === filterSupervisor) || {
                        value: '',
                        label: 'Všichni nadřízení',
                      }
                    }
                    onSelectChange={(selected) => setFilterSupervisor(selected?.value || '')}
                  />
                )}

                <InputGroup
                  id="roleFilter"
                  className={styles.roleFilter}
                  label=""
                  isSelect
                  size="small"
                  placeholder="Vybrat oprávnění"
                  selectOptions={[
                    { value: '', label: 'Všechna oprávnění' },
                    ...roles.map((role) => ({
                      value: role.id.toString(),
                      label: role.name,
                    })),
                  ]}
                  value={
                    roles
                      .map((role) => ({
                        value: role.id.toString(),
                        label: role.name,
                      }))
                      .find((option) => option.value === filterRole) || {
                      value: '',
                      label: 'Všechna oprávnění',
                    }
                  }
                  onSelectChange={(selected) => setFilterRole(selected?.value || '')}
                />

                <div className={styles.checkboxContainer}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={requiresApproval ?? false}
                      onChange={() =>
                        setRequiresApproval((prev) => (prev === null ? true : prev ? null : false))
                      }
                    />
                    Vyžaduje kontrolu
                  </label>

                  {requiresApproval || filterRole || filterSupervisor ? (
                    <Button onClick={handleResetFilter} className={styles.resetButton}>
                      <FontAwesomeIcon icon={faClose} /> Smazat filtry
                    </Button>
                  ) : null}
                </div>

                <span className={styles.divider}></span>
              </div>

              <div className={styles.sortContainer}>
                <div className={styles.sortBy}>
                  <label htmlFor="sortBySelect">Řadit podle</label>
                  <div className={styles.selectWrapper}>
                    <select
                      id="sortBySelect"
                      value={selectedSorting?.value || ''}
                      onChange={(e) => {
                        const selectedValue = e.target.value;
                        const selectedOption = [
                          { value: 'name', label: 'Jméno' },
                          { value: 'email', label: 'Email' },
                          { value: 'role_name', label: 'Práva' },
                          { value: 'supervisor', label: 'Nadřízený' },
                          { value: 'job_title', label: 'Role' },
                          { value: 'auto_approved', label: 'Kontrola' },
                        ].find((option) => option.value === selectedValue);

                        if (selectedOption) {
                          setSelectedSorting(selectedOption);
                          setSorting([{ id: selectedOption.value, desc: false }]);
                        }
                      }}
                    >
                      <option value="" disabled>
                        Vyberte možnost
                      </option>
                      <option value="name">Jméno</option>
                      <option value="email">Email</option>
                      <option value="role_name">Práva</option>
                      <option value="supervisor">Nadřízený</option>
                      <option value="job_title">Role</option>
                      <option value="auto_approved">Kontrola</option>
                    </select>
                    <FontAwesomeIcon icon={faChevronDown} className={styles.icon} />
                  </div>
                </div>

                <Button
                  className={styles.sortOrderButton}
                  onClick={() =>
                    setSorting((prev) =>
                      prev[0]?.desc
                        ? [{ id: prev[0].id, desc: false }]
                        : [{ id: prev[0]?.id || 'name', desc: true }],
                    )
                  }
                >
                  <FontAwesomeIcon
                    icon={sorting[0]?.desc ? faArrowUpWideShort : faArrowDownShortWide}
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

              {showModal && selectedUser && (
                <AlertModal
                  title="Smazat uživatele"
                  message="Opravdu chcete smazat uživatele"
                  userName={selectedUser.name}
                  onConfirm={confirmDelete}
                  onCancel={() => setShowModal(false)}
                />
              )}
            </div>

            {/* Karty uživatelů pro mobilní zařízení */}
            {loading ? (
              <Loader isContentOnly />
            ) : (
              <UserCards
                users={users}
                handleDelete={handleDelete}
                isLoading={loading}
                onEdit={(userId) => navigate(`/edit-user/${userId}`)}
              />
            )}
          </div>

          {/* Tabulka uživatelů pro desktop */}
          <table className={styles.table}>
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header, index) => (
                    <th
                      key={header.id}
                      ref={(el) => (thRefs.current[index] = el)}
                      className={`
                        ${
                          ['role_name', 'auto_approved'].includes(header.id)
                            ? styles.smallColumn
                            : ''
                        }
                        ${header.id === 'actions' ? styles.actionColumn : ''}
                        ${stickyHeaders[index] ? styles.isSticky : ''}
                      `}
                      onClick={
                        header.id === 'actions'
                          ? undefined
                          : header.column.getToggleSortingHandler()
                      }
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('columnId', header.id);
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const draggedColumnId = e.dataTransfer.getData('columnId');

                        setColumnOrder((oldOrder) => {
                          const currentOrder =
                            oldOrder && oldOrder.length > 0
                              ? oldOrder
                              : columns.map((col) => col.id as string);

                          const targetIndex = currentOrder.indexOf(header.id);
                          const fromIndex = currentOrder.indexOf(draggedColumnId);

                          if (fromIndex === -1 || targetIndex === -1) {
                            console.error('Chyba: indexy nebyly nalezeny.');
                            return currentOrder;
                          }

                          const newOrder = [...currentOrder];
                          newOrder.splice(targetIndex, 0, newOrder.splice(fromIndex, 1)[0]);
                          return newOrder;
                        });
                      }}
                    >
                      <div className={styles.headerContent}>
                        <div className={styles.headerTitle}>
                          {header.column.columnDef.header === 'Jméno' && (
                            <FontAwesomeIcon icon={faUser} />
                          )}
                          {header.column.columnDef.header === 'Email' && (
                            <FontAwesomeIcon icon={faEnvelope} />
                          )}
                          {header.column.columnDef.header === 'Práva' && (
                            <FontAwesomeIcon icon={faKey} />
                          )}
                          {header.column.columnDef.header === 'Nadřízený' && (
                            <FontAwesomeIcon icon={faUserTie} />
                          )}
                          {header.column.columnDef.header === 'Kontrola' && (
                            <FontAwesomeIcon icon={faQuestionCircle} />
                          )}
                          {header.column.columnDef.header === 'Role' && (
                            <FontAwesomeIcon icon={faUser} />
                          )}
                          <span>
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </span>
                        </div>
                        {header.id === 'actions' ? null : header.column.getIsSorted() === 'asc' ? (
                          <FontAwesomeIcon icon={faSortUp} />
                        ) : header.column.getIsSorted() === 'desc' ? (
                          <FontAwesomeIcon icon={faSortDown} />
                        ) : (
                          <FontAwesomeIcon className={styles.iconGrey} icon={faSort} />
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.length} className={styles.loaderCell}>
                    <Loader isContentOnly />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className={styles.noResults}>
                    Žádné výsledky nebyly nalezeny.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className={
                          ['role_name', 'auto_approved'].includes(cell.column.id)
                            ? styles.smallColumn
                            : ''
                        }
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Paginace */}
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
              <p>
                Zobrazeno {currentPage * pageSize - pageSize + 1} až{' '}
                {Math.min(currentPage * pageSize, pagination?.total || 0)} z celkem{' '}
                {pagination?.total || 0} záznamů
              </p>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AllUsers;
