import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import classNames from 'classnames';
import {
  faTasks,
  faClock,
  faSave,
  faUser,
  faPenToSquare,
  faCalendarDays,
  faBriefcase,
  faQuestionCircle,
  faPen,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import Menu from '../components/Menu';
import InputGroup from '@/components/InputGroup';
import Button from '@/components/Button';
import Header from '@/components/Header';
import Loader from '@/components/Loader';
import MyDatePicker from '@/components/MyDatePicker';
import JobTitle from '@/components/JobTitle';

import styles from '@/pages/EditReport.module.scss';

import { useReportContext } from '@/providers/ReportProvider';
import { useTasksContext } from '@/providers/TaskProvider';
import { useClientContext } from '@/providers/ClientsProvider';
import { useAuthContext } from '@/providers/AuthProvider';
import { useMessage } from '@/providers/MessageProvider';
import { useJobTitles } from '@/providers/JobTitleProvider';

// Subtypy úkolů
export interface TaskType {
  global: string[];
  brand: string[];
  product: string[];
  marketing: string[];
}

// Interface pro data z API pro report
interface ReportDataFromApi {
  id: number;
  approved: boolean;
  length: string;
  summary: string;
  task: string;
  client_id: number | null;
  user: {
    id: number;
    name: string;
  };
  job_title: string;
  date: string;
  task_subtype?: string;
  created_at: string;
  job_title_id: number;
  userName: string;
  task_id: string;
}

const EditReport: React.FC = () => {
  // ID reportu z URL a navigace
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const fromPage = location.state?.from || '/my-reports';

  // Data a funkce z kontextů
  const {
    fetchReportById,
    updateReport,
    assignTaskToUnknownReport,
    loading: reportLoading,
  } = useReportContext();
  const {
    tasks,
    activeTasks,
    fetchTasks,
    fetchActiveTasks,
    loading: tasksLoading,
    taskTypes,
  } = useTasksContext();
  const { clients, fetchClients, loading: clientsLoading } = useClientContext();
  const { jobTitles } = useJobTitles();
  const { user } = useAuthContext();
  const { showMessage } = useMessage();

  // Lokální stavy
  const [originalClientId, setOriginalClientId] = useState<number | null>(null);
  const [originalKnown, setOriginalKnown] = useState<boolean | null>(null);
  const [reportId, setReportId] = useState<string>('');
  const [unknownTask, setUnknownTask] = useState<boolean>(false);
  const [showAllTasks, setShowAllTasks] = useState<boolean>(user?.show_all_tasks || false);

  const [reportCreatedAt, setReportCreatedAt] = useState('');
  const [userName, setUserName] = useState('');
  const [userJobTitleId, setUserJobTitleId] = useState<number | null>(null);

  // Data ve formuláři
  const [formData, setFormData] = useState({
    summary: '',
    length: '',
    date: new Date(),
    task_id: '',
    company_id: '',
    job_title_id: '',
    taskSubtype: '',
  });

  // Seznam subtypů úkolů pro vybraný úkol
  const [filteredSubtypes, setFilteredSubtypes] = useState<
    { label: string; options: { value: string; label: string }[] }[]
  >([]);
  // Seznam úkolů pro select
  const [hierarchicalTaskOptions, setHierarchicalTaskOptions] = useState<
    { label: string; options: { value: string; label: string }[] }[]
  >([]);

  // Stavy pro zobrazení loaderu
  const [localLoading, setLocalLoading] = useState(true);
  const isLoading = reportLoading || localLoading || tasksLoading || clientsLoading;

  // Stavy pro dropdown s čtvrtmi hodinami
  const defaultValuesQuarter = ['0.25', '0.5', '0.75', '1', '1.25', '1.5', '1.75', '2'];
  const [showDropdown, setShowDropdown] = useState(false);

  // Vyhodnocení, zda je výkaz neznámého úkolu, a nastavení ID výkazu
  useEffect(() => {
    if (!id) return;
    setReportId(id);

    const parts = id.split('-');
    const suffix = parts[parts.length - 1];
    const isUnknown = suffix === 'unknown';

    setUnknownTask(isUnknown);
    setOriginalKnown(!isUnknown);
  }, [id]);

  // Načtení úkolů a klientů, pokud nejsou načtené
  useEffect(() => {
    (async () => {
      if (!tasks.length && !activeTasks.length) {
        await fetchTasks();
        await fetchActiveTasks();
      }
      if (!clients.length) {
        await fetchClients();
      }
    })();
  }, [tasks, activeTasks, clients, fetchTasks, fetchActiveTasks, fetchClients]);

  // Načtení dat reportu, pokud je známé ID
  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (!reportId) {
        return;
      }

      setLocalLoading(true);
      try {
        const resp = await fetchReportById(reportId);
        if (!isMounted) return;

        const data = resp.data as ReportDataFromApi;
        const createdAtStr = new Date(data.created_at).toLocaleString('cs-CZ', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });

        setReportCreatedAt(createdAtStr);
        setUserName(data.user.name);
        setUserJobTitleId(data.job_title_id);

        setFormData({
          summary: data.summary || '',
          length: data.length || '',
          date: new Date(data.date),
          task_id: data.task_id || '',
          company_id: data.client_id ? String(data.client_id) : '',
          job_title_id: data.job_title_id ? String(data.job_title_id) : '',
          taskSubtype: data.task_subtype || '',
        });

        setOriginalClientId(data.client_id || null);

        // Zapnutí zobrazení všech úkolů, pokud klient nemá žádné aktivní úkoly
        if (data.task_id && !activeTasks.some((t) => t.code === data.task_id)) {
          setShowAllTasks(true);
        }
      } catch (err: any) {
        console.error('[EditReport] Error fetching report:', err);
        if (isMounted) {
          showMessage('Chyba při načítání reportu.', 'error');
        }
      } finally {
        if (isMounted) {
          setLocalLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [reportId, fetchReportById, activeTasks, showMessage]);

  // Sestavení seznamu úkolů dle klienta a nastavení do hierarchicalTaskOptions
  useEffect(() => {
    if (clientsLoading || tasksLoading) return;

    if (!clients.length && !tasks.length && !activeTasks.length) {
      setHierarchicalTaskOptions([]);
      return;
    }

    let relevantTasks;

    if (unknownTask) {
      const selectedClientId = originalClientId || Number(formData.company_id);
      relevantTasks = (showAllTasks ? tasks : activeTasks).filter(
        (task) => task.company_id === selectedClientId,
      );
    } else if (originalKnown) {
      relevantTasks = showAllTasks ? tasks : activeTasks;
    } else {
      const selectedClientId = originalClientId || Number(formData.company_id);
      relevantTasks = (showAllTasks ? tasks : activeTasks).filter(
        (task) => task.company_id === selectedClientId,
      );
    }

    const grouped = relevantTasks.reduce((acc, task) => {
      const client = clients.find((c) => c.id === task.company_id);
      const clientName = client?.name || 'Neznámý klient';
      const label = `${clientName} - ${task.name || 'Neznámý úkol'}${
        showAllTasks ? ` (${task.code})` : ''
      }`;

      const existingGroup = acc.find((group) => group.label === clientName);
      const option = { value: task.code, label };

      if (!existingGroup) {
        acc.push({
          label: clientName,
          options: [option],
        });
      } else {
        existingGroup.options.push(option);
      }
      return acc;
    }, [] as { label: string; options: { value: string; label: string }[] }[]);

    setHierarchicalTaskOptions(grouped);
  }, [
    clientsLoading,
    tasksLoading,
    clients,
    tasks,
    activeTasks,
    showAllTasks,
    unknownTask,
    formData.company_id,
    originalClientId,
    originalKnown,
  ]);

  // Vygenerování seznamu subtypů pro vybraný úkol
  useEffect(() => {
    if (unknownTask) {
      setFilteredSubtypes([]);
      return;
    }
    if (!formData.task_id) {
      setFilteredSubtypes([]);
      return;
    }

    const foundTask =
      tasks.find((t) => t.code === formData.task_id) ||
      activeTasks.find((t) => t.code === formData.task_id);

    if (!foundTask || !foundTask.type || !taskTypes) {
      setFilteredSubtypes([]);
      return;
    }

    const typeKey = foundTask.type.toLowerCase() as keyof TaskType;
    if (!taskTypes[typeKey]) {
      setFilteredSubtypes([]);
      return;
    }

    const globalSubs = taskTypes.global || [];
    const specificSubs = taskTypes[typeKey] || [];

    if (Array.isArray(globalSubs) && Array.isArray(specificSubs)) {
      const subtypes = [
        {
          label: 'Global',
          options: globalSubs.map((s) => ({ value: s, label: s })),
        },
        {
          label: foundTask.type,
          options: specificSubs.map((s) => ({ value: s, label: s })),
        },
      ];
      setFilteredSubtypes(subtypes);
    } else {
      setFilteredSubtypes([]);
    }
  }, [unknownTask, formData.task_id, tasks, activeTasks, taskTypes]);

  // Handler pro změny ve formuláři
  const handleInputChange = (key: string, value: any) => {
    setFormData((prev) => {
      const updatedFormData = { ...prev, [key]: value };
      if (key === 'task_id') {
        updatedFormData.taskSubtype = '';
      }
      return updatedFormData;
    });
  };

  // Handler pro změnu doby trvání v hodinách
  const handleLengthChange = (value: string) => {
    const sanitized = value.replace(/[^0-9,.\s]/g, '');
    if (sanitized !== '' && parseFloat(sanitized.replace(',', '.')) > 48) {
      showMessage('Nepřeháněj to, maximální limit je 48 hodin!', 'error');
      setFormData((prev) => ({ ...prev, length: '48' }));
      return;
    }
    setFormData((prev) => ({ ...prev, length: sanitized }));
    setShowDropdown(true);
  };

  // Zaokrouhlování doby trvání na nejbližší čtvrt hodinu
  const roundLengthToQuarter = () => {
    const { length } = formData;
    if (!length.trim()) {
      setFormData((prev) => ({ ...prev, length: '' }));
      return;
    }

    const normalizedLength = length.replace(',', '.');
    const parsed = parseFloat(normalizedLength);
    if (isNaN(parsed) || parsed <= 0) {
      setFormData((prev) => ({ ...prev, length: '' }));
      return;
    }

    const rounded = (Math.round(parsed * 4) / 4).toFixed(2);
    setFormData((prev) => ({
      ...prev,
      length: rounded,
    }));
  };

  // Handler pro výběr hodnoty z dropdownu (čtvrt hodiny)
  const handleSelectValue = (val: string) => {
    setFormData((prev) => ({ ...prev, length: val }));
    setShowDropdown(false);
  };

  // Handler pro "blur" vstupu doby trvání
  const handleBlur = () => {
    setShowDropdown(false);
    roundLengthToQuarter();
  };

  // Handler pro změnu stavu "neznám úkol" (unknownTask)
  const handleUnknownTaskChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isUnknown = e.target.checked;
    setUnknownTask(isUnknown);

    let newShowAllTasks = showAllTasks;
    if (!isUnknown) {
      // Kontrola, zda má vybraný klient nějaké aktivní úkoly
      const selectedClientId = originalClientId || Number(formData.company_id) || null;
      const hasActiveTasks = activeTasks.some((task) => task.company_id === selectedClientId);
      if (!hasActiveTasks) {
        newShowAllTasks = true;
        setShowAllTasks(true);
      }
    }

    const selectedClientId = isUnknown
      ? originalClientId
      : originalKnown === false
      ? originalClientId
      : null;

    const relevantTasks = (newShowAllTasks ? tasks : activeTasks).filter((task) =>
      selectedClientId ? task.company_id === selectedClientId : true,
    );

    const grouped = relevantTasks.reduce((acc, task) => {
      const client = clients.find((c) => c.id === task.company_id);
      const clientName = client?.name || 'Neznámý klient';
      const label = `${clientName} - ${task.name || 'Neznámý úkol'}${
        newShowAllTasks ? ` (${task.code})` : ''
      }`;

      const existingGroup = acc.find((group) => group.label === clientName);
      const option = { value: task.code, label };

      if (!existingGroup) {
        acc.push({
          label: clientName,
          options: [option],
        });
      } else {
        existingGroup.options.push(option);
      }
      return acc;
    }, [] as { label: string; options: { value: string; label: string }[] }[]);

    setHierarchicalTaskOptions(grouped);
  };

  // Submit formuláře pro uložení změn v reportu
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    handleBlur();

    const numericLength = parseFloat(formData.length || '0');
    if (numericLength > 48) {
      showMessage('Nepřeháněj to, maximální limit je 48 hodin!', 'error');
      return;
    }
    if (!numericLength || numericLength <= 0) {
      showMessage('Zadejte prosím dobu trvání (větší než 0).', 'error');
      return;
    }
    if (!unknownTask && !formData.task_id) {
      showMessage('Vyberte prosím úkol.', 'error');
      return;
    }
    if (unknownTask && !formData.company_id) {
      showMessage('Vyberte prosím klienta (neznám úkol).', 'error');
      return;
    }
    if (!formData.summary || !formData.job_title_id || !formData.date) {
      showMessage('Vyplňte všechna povinná pole: popis, role, datum a dobu trvání.', 'error');
      return;
    }
    if (!unknownTask && filteredSubtypes.length > 0 && !formData.taskSubtype) {
      showMessage('Vyberte také konkrétní typ úkolu (subtype).', 'error');
      return;
    }

    try {
      const dateStr = formData.date.toISOString().split('T')[0];
      const payload: any = {
        date: dateStr,
        length: formData.length,
        summary: formData.summary,
        job_title_id: Number(formData.job_title_id),
        task_subtype: unknownTask ? '' : formData.taskSubtype || '',
      };

      if (unknownTask) {
        payload.company_id = formData.company_id ? Number(formData.company_id) : undefined;
      } else {
        payload.task_id = formData.task_id;
      }

      // Přiřazení úkolu k neznámému výkazu
      if (reportId.includes('-unknown') && !unknownTask && formData.task_id) {
        const response = await assignTaskToUnknownReport(reportId, {
          task_id: formData.task_id,
          task_subtype: formData.taskSubtype || '',
        });
        if (response.new_report_id) {
          showMessage('Úkol byl úspěšně přiřazen a výkaz byl aktualizován.', 'success');
          navigate(`/edit-report/${response.new_report_id}-known`, {
            state: { from: fromPage },
          });
          return;
        } else {
          showMessage('Přiřazení úkolu se nezdařilo. Nebylo vráceno ID nového reportu.', 'error');
          return;
        }
      }

      // Aktualizace reportu
      await updateReport(reportId, payload);
      const reportSummary = formData.summary;
      showMessage(`Výkaz "${reportSummary}" byl úspěšně upraven.`, 'success');
      navigate(fromPage);
    } catch (err: any) {
      console.error('[EditReport] handleSubmit error:', err);
      if (err?.message) {
        showMessage(err.message, 'error');
      } else if (err?.errors) {
        const joinedErrors = Object.values(err.errors).flat().join(' | ');
        showMessage(joinedErrors, 'error');
      } else {
        showMessage('Chyba při ukládání změn.', 'error');
      }
    }
  };

  // Loader při načítání dat
  if (isLoading) {
    return (
      <div className={styles.layoutContainer}>
        <Menu activeItem={fromPage === '/my-reports' ? '/my-reports' : '/all-reports'} />
        <div className={styles.contentContainer}>
          <Header
            icon={faPen}
            title="Upravit výkaz"
            backButton={{ link: fromPage, showOn: 'both' }}
          />
          <div className={styles.content}>
            <Loader isContentOnly />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.layoutContainer}>
      <Menu activeItem={fromPage === '/my-reports' ? '/my-reports' : '/all-reports'} />
      <div className={styles.contentContainer}>
        <Header
          icon={faPen}
          title="Upravit výkaz"
          backButton={{ link: fromPage, showOn: 'both' }}
        />
        <div className={styles.content}>
          <>
            {/* Zobrazení autora a data vytvoření */}
            <div className={styles.reportInfo}>
              <span className={styles.Author}>
                <span>
                  <JobTitle returnType="icon" id={userJobTitleId} />
                </span>
                {userName}
              </span>
              {(user?.role.id === 1 || user?.role.id === 2) && (
                <span className={styles.CreatedAt}>
                  Vytvořeno: <span>{reportCreatedAt}</span>
                </span>
              )}
            </div>

            {/* Formulář pro úpravu výkazu */}
            <form onSubmit={handleSubmit}>
              {unknownTask ? (
                <InputGroup
                  id="company_id"
                  label="Klient"
                  isSelect
                  icon={faBriefcase}
                  selectOptions={clients.map((c) => ({
                    value: c.id.toString(),
                    label: c.name,
                  }))}
                  value={formData.company_id || ''}
                  onSelectChange={(option) => handleInputChange('company_id', option?.value || '')}
                  placeholder="Vyberte klienta..."
                  required
                />
              ) : (
                <>
                  <InputGroup
                    id="task_id"
                    label="Vybrat úkol"
                    isSelect
                    icon={faTasks}
                    selectOptions={hierarchicalTaskOptions || []}
                    value={formData.task_id || ''}
                    onSelectChange={(option) => handleInputChange('task_id', option?.value || '')}
                    placeholder="Vyberte úkol..."
                  />

                  {filteredSubtypes.length > 0 && (
                    <InputGroup
                      id="taskSubtype"
                      icon={faQuestionCircle}
                      label="Co konkrétně"
                      isSelect
                      selectOptions={filteredSubtypes || []}
                      value={formData.taskSubtype || ''}
                      onSelectChange={(option) =>
                        handleInputChange('taskSubtype', option?.value || '')
                      }
                      placeholder="Vyberte konkrétní typ úkolu..."
                    />
                  )}

                  <label className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={showAllTasks}
                      onChange={(e) => {
                        setShowAllTasks(e.target.checked);
                        const filteredTasks = (e.target.checked ? tasks : activeTasks).filter(
                          (task) => !unknownTask || task.company_id === Number(formData.company_id),
                        );
                        const grouped = filteredTasks.reduce(
                          (acc, task) => {
                            const client = clients.find((c) => c.id === task.company_id);
                            const clientName = client?.name || 'Neznámý klient';
                            const label = `${clientName} - ${task.name || 'Neznámý úkol'}${
                              showAllTasks ? ` (${task.code})` : ''
                            }`;

                            const existingGroup = acc.find((group) => group.label === clientName);
                            const option = { value: task.code, label };

                            if (!existingGroup) {
                              acc.push({
                                label: clientName,
                                options: [option],
                              });
                            } else {
                              existingGroup.options.push(option);
                            }
                            return acc;
                          },
                          [] as {
                            label: string;
                            options: { value: string; label: string }[];
                          }[],
                        );
                        setHierarchicalTaskOptions(grouped);
                      }}
                    />
                    Zobrazit všechny úkoly
                  </label>
                </>
              )}

              {unknownTask && (
                <div className={styles.checkboxContainer}>
                  <label className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={unknownTask}
                      onChange={handleUnknownTaskChange}
                    />
                    Neznám úkol
                  </label>
                </div>
              )}

              <InputGroup
                id="summary"
                label="Popis úkolu"
                icon={faPenToSquare}
                isTextarea
                rows={3}
                value={formData.summary}
                onChange={(e) => handleInputChange('summary', e.target.value)}
                required
              />

              <InputGroup
                id="job_title_id"
                label="Role"
                isSelect
                icon={faUser}
                selectOptions={jobTitles.map((jt) => ({
                  value: jt.id.toString(),
                  label: jt.name,
                }))}
                value={formData.job_title_id}
                onSelectChange={(option) => handleInputChange('job_title_id', option?.value || '')}
                required
              />

              <div className={styles.datepickerContainer}>
                <label>
                  <FontAwesomeIcon icon={faCalendarDays} />
                  Datum
                </label>
                <MyDatePicker
                  selectedDate={formData.date}
                  onDateChange={(date) => handleInputChange('date', date)}
                  required
                  maxDate={new Date()}
                />
              </div>

              <div className={styles.lengthInput}>
                <label htmlFor="length">
                  <FontAwesomeIcon icon={faClock} />
                  Doba trvání (h)
                </label>
                <input
                  id="length"
                  type="text"
                  value={formData.length}
                  onChange={(e) => handleLengthChange(e.target.value)}
                  onFocus={() => setShowDropdown(true)}
                  onBlur={handleBlur}
                  required
                  autoComplete="off"
                />
                <div
                  className={classNames(styles.dropdown, {
                    [styles.expanded]: showDropdown,
                    [styles.collapsed]: !showDropdown,
                  })}
                >
                  {defaultValuesQuarter.map((val) => (
                    <div
                      key={val}
                      onMouseDown={() => handleSelectValue(val)}
                      className={styles.dropdownItem}
                    >
                      {val}
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.buttonContainer}>
                <Button type="submit">
                  Uložit změny <FontAwesomeIcon icon={faSave} />
                </Button>
              </div>
            </form>
          </>
        </div>
      </div>
    </div>
  );
};

export default EditReport;
