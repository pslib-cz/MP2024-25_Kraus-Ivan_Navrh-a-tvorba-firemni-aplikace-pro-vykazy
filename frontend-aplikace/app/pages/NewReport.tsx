import React, { useEffect, useState, useCallback } from 'react';
import Menu from '../components/Menu';
import InputGroup from '@/components/InputGroup';
import Button from '@/components/Button';
import Header from '@/components/Header';
import Loader from '@/components/Loader';
import MyDatePicker from '@/components/MyDatePicker';
import {
  faTasks,
  faClock,
  faSave,
  faUser,
  faPenToSquare,
  faCirclePlus,
  faCalendarDays,
  faBriefcase,
  faQuestionCircle,
  faCopy,
} from '@fortawesome/free-solid-svg-icons';
import styles from '@/pages/NewReport.module.scss';
import { useReportContext } from '@/providers/ReportProvider';
import { useTasksContext } from '@/providers/TaskProvider';
import { useClientContext } from '@/providers/ClientsProvider';
import { useAuthContext } from '@/providers/AuthProvider';
import { useMessage } from '@/providers/MessageProvider';
import { useJobTitles } from '@/providers/JobTitleProvider';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import classNames from 'classnames';

export interface TaskType {
  global: string[];
  brand: string[];
  product: string[];
  marketing: string[];
}

export interface TaskTimer {
  id: string;
  task_id: string;
  timeSpent: number;
  isRunning: boolean;
  lastUpdate?: number;
  isPending?: boolean;
}

const LOCAL_STORAGE_KEY = 'timers';

const NewReport: React.FC = () => {
  const { createReport, loading: reportLoading } = useReportContext();
  const { fetchActiveTasks, fetchTasks, tasks, activeTasks, taskTypes, fetchTaskSubtypes } =
    useTasksContext();
  const { fetchClients, clients } = useClientContext();
  const { user } = useAuthContext();
  const { jobTitles } = useJobTitles();
  const { showMessage } = useMessage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [isInitialUrlStateSet, setIsInitialUrlStateSet] = useState(false);

  const [filteredSubtypes, setFilteredSubtypes] = useState<any[]>([]);
  const [hierarchicalTaskOptions, setHierarchicalTaskOptions] = useState<
    { label: string; options: { value: string; label: string }[] }[]
  >([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [stayOnPage, setStayOnPage] = useState(false);

  const [loadingData, setLoadingData] = useState(true);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [isTasksFetched, setIsTasksFetched] = useState(false);

  const [taskNotFoundShown, setTaskNotFoundShown] = useState(false);

  const fromDuplicate = searchParams.get('from') === 'duplicate';
  const fromToggle = searchParams.get('from') === 'toggle';

  const defaultValues = ['0.25', '0.5', '0.75', '1', '1.25', '1.5', '1.75', '2'];

  const [formData, setFormData] = useState({
    summary: searchParams.get('summary') || '',
    length: searchParams.get('length') || '',
    date: searchParams.get('date') ? new Date(searchParams.get('date')!) : new Date(),
    task_id: searchParams.get('task_id') || '',
    company_id: searchParams.get('client_id') || '',
    job_title_id: searchParams.get('job_title_id') || '',
    showAllTasks: user?.show_all_tasks || false,
    unknownTask: false,
    taskType: '',
    taskSubtype: searchParams.get('task_subtype') || '',
  });

  useEffect(() => {
    if (user?.job_title?.id) {
      setFormData((prev) => ({
        ...prev,
        job_title_id: user.job_title.id.toString(),
      }));
    }
  }, [user]);

  useEffect(() => {
    fetchTaskSubtypes();
  }, [fetchTaskSubtypes]);

  useEffect(() => {
    (async () => {
      setLoadingData(true);
      try {
        await fetchActiveTasks();
        await fetchClients();
      } catch {}
      setLoadingData(false);
    })();
  }, [fetchActiveTasks, fetchClients]);

  useEffect(() => {
    (async () => {
      if (!loadingData) {
        const hasTaskId = !!searchParams.get('task_id');
        if (hasTaskId || formData.showAllTasks) {
          setIsLoadingTasks(true);
          setIsTasksFetched(false);
          try {
            await fetchTasks();
          } catch {}
          setIsLoadingTasks(false);
          setIsTasksFetched(true);
        } else {
          setIsTasksFetched(true);
        }
      }
    })();
  }, [loadingData, searchParams, formData.showAllTasks, fetchTasks]);

  useEffect(() => {
    if (loadingData || !isTasksFetched || isInitialUrlStateSet) {
      return;
    }

    setIsInitialUrlStateSet(true);

    const taskId = searchParams.get('task_id');
    const companyId = searchParams.get('client_id');
    const length = searchParams.get('length');
    const date = searchParams.get('date');

    if (!taskId && !companyId) {
      return;
    }

    let foundTask = activeTasks.find((t) => t.code === taskId);
    let showAll = false;

    if (!foundTask && taskId) {
      const taskInAll = tasks.find((t) => t.code === taskId);
      if (taskInAll) {
        foundTask = taskInAll;
        showAll = true;
      }
    }

    if (foundTask) {
      const taskTypeKey = foundTask.type?.toLowerCase() as keyof TaskType;
      if (taskTypes && taskTypes[taskTypeKey]) {
        const globalSubtypes = taskTypes.global || [];
        const specificSubtypes = taskTypes[taskTypeKey] || [];
        if (Array.isArray(globalSubtypes) && Array.isArray(specificSubtypes)) {
          setFilteredSubtypes([
            {
              label: 'Global',
              options: globalSubtypes.map((sub) => ({ value: sub, label: sub })),
            },
            {
              label: foundTask.type,
              options: specificSubtypes.map((sub) => ({ value: sub, label: sub })),
            },
          ]);
        } else {
          setFilteredSubtypes([]);
        }
      } else {
        setFilteredSubtypes([]);
      }

      setFormData((prev) => ({
        ...prev,
        task_id: foundTask?.code || '',
        unknownTask: false,
        showAllTasks: showAll,
      }));

      setTaskNotFoundShown(false);
    } else {
      setFilteredSubtypes([]);
      setFormData((prev) => ({ ...prev, task_id: '', unknownTask: true }));

      if (taskId && !taskNotFoundShown) {
        showMessage(`Nepodařilo se najít úkol s kódem: ${taskId}`, 'error');
        setTaskNotFoundShown(true);
      }
    }

    if (companyId) {
      const client = clients.find((c) => c.id.toString() === companyId);
      if (client) {
        setFormData((prev) => ({
          ...prev,
          company_id: client.id.toString(),
        }));
      } else {
        showMessage(`Nepodařilo se najít klienta s ID: ${companyId}`, 'error');
      }
    }

    if (length) {
      setFormData((prev) => ({ ...prev, length }));
    }

    if (date) {
      const parsed = new Date(date);
      if (!isNaN(parsed.getTime())) {
        setFormData((prev) => ({ ...prev, date: parsed }));
      } else {
        showMessage(`Nepodařilo se interpretovat datum: ${date}`, 'error');
      }
    }
  }, [
    loadingData,
    isTasksFetched,
    tasks,
    activeTasks,
    clients,
    searchParams,
    taskTypes,
    showMessage,
    taskNotFoundShown,
    isInitialUrlStateSet,
  ]);

  useEffect(() => {
    if ((!tasks.length && !activeTasks.length) || !clients.length) {
      return;
    }

    const relevantTasks = formData.showAllTasks ? tasks : activeTasks;

    const grouped = relevantTasks.reduce((acc, task) => {
      const client = clients.find((c) => c.id === task.company_id);
      const clientName = client?.name || 'Neznámý klient';
      const taskOption = {
        value: task.code,
        label:
          `${clientName} - ${task.name || 'Neznámý úkol'}` +
          (formData.showAllTasks ? ` (${task.code})` : ''),
      };
      const existingGroup = acc.find((g) => g.label === clientName);
      if (existingGroup) {
        existingGroup.options.push(taskOption);
      } else {
        acc.push({ label: clientName, options: [taskOption] });
      }
      return acc;
    }, [] as { label: string; options: { value: string; label: string }[] }[]);

    setHierarchicalTaskOptions(grouped);
  }, [tasks, activeTasks, clients, formData.showAllTasks]);

  const handleInputChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));

    if (key === 'task_id' && value) {
      setFormData((prev) => ({ ...prev, taskSubtype: '' }));
      setFilteredSubtypes([]);

      const selectedTask =
        tasks.find((t) => t.code === value) || activeTasks.find((t) => t.code === value);

      if (selectedTask && taskTypes) {
        const taskTypeKey = selectedTask.type?.toLowerCase() as keyof TaskType;
        const specificSubtypes = taskTypes[taskTypeKey] || [];

        if (specificSubtypes.length > 0) {
          const globalSubtypes = taskTypes.global || [];
          setFilteredSubtypes([
            ...(globalSubtypes.length > 0
              ? [
                  {
                    label: 'Global',
                    options: globalSubtypes.map((sub) => ({
                      value: sub,
                      label: sub,
                    })),
                  },
                ]
              : []),
            {
              label: selectedTask.type,
              options: specificSubtypes.map((sub) => ({
                value: sub,
                label: sub,
              })),
            },
          ]);
        }
      }
    }
  };

  const roundLengthToQuarter = (val: string) => {
    const parsed = parseFloat(val);
    if (isNaN(parsed) || parsed <= 0) return '';
    return (Math.round(parsed * 4) / 4).toFixed(2);
  };

  const handleLengthChange = (value: string) => {
    const sanitized = value.replace(/[^0-9.]/g, '');

    if (sanitized !== '' && parseFloat(sanitized) > 48) {
      showMessage('Nepřeháněj to, maximální limit je 48 hodin!', 'error');
      setFormData((prev) => ({ ...prev, length: '48' }));
      return;
    }
    setFormData((prev) => ({ ...prev, length: sanitized }));
    setShowDropdown(true);
  };

  const handleSelectValue = (val: string) => {
    setFormData((prev) => ({ ...prev, length: val }));
    setShowDropdown(false);
  };

  const handleBlur = () => {
    setShowDropdown(false);
    setFormData((prev) => ({ ...prev, length: roundLengthToQuarter(prev.length) }));
  };

    const generateShareUrl = useCallback(() => {
        const baseUrl = window.location.origin + '/new-report';
        const url = new URL(baseUrl);

        if (formData.task_id && !formData.unknownTask) {
            url.searchParams.set('task_id', formData.task_id);
        }

        if (formData.company_id) {
            url.searchParams.set('client_id', formData.company_id);
        }

        if (formData.summary) {
            url.searchParams.set('summary', formData.summary);
        }

        if (formData.length) {
            url.searchParams.set('length', formData.length);
        }

        if (!formData.unknownTask && formData.taskSubtype) {
            url.searchParams.set('task_subtype', formData.taskSubtype);
        }

        return url.toString();
    }, [formData]);


  const handleCopyUrl = async () => {
    try {
      const shareUrl = generateShareUrl();
      await navigator.clipboard.writeText(shareUrl);
      showMessage('Odkaz na výkaz zkopírován!', 'success');
    } catch (err) {
      showMessage('Nepodařilo se zkopírovat odkaz.', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalLength = roundLengthToQuarter(formData.length);
    setFormData((prev) => ({ ...prev, length: finalLength }));

    if (!finalLength) {
      showMessage('Zadejte prosím dobu trvání (větší než 0).', 'error');
      return;
    }

    if (parseFloat(finalLength) > 48) {
      showMessage('Maximální doba trvání je 48 hodin.', 'error');
      return;
    }

    if (!formData.unknownTask && !formData.task_id && !formData.company_id) {
      showMessage('Vyplňte prosím úkol nebo klienta.', 'error');
      return;
    }

    if (formData.unknownTask && !formData.company_id) {
      showMessage('Vyplňte prosím klienta, pokud je úkol neznámý.', 'error');
      return;
    }

    if (!formData.summary.trim()) {
      showMessage('Vyplňte prosím popis úkolu.', 'error');
      return;
    }

    if (!formData.job_title_id) {
      showMessage('Vyberte prosím roli.', 'error');
      return;
    }

    if (!formData.date) {
      showMessage('Vyberte prosím datum.', 'error');
      return;
    }

    if (!formData.unknownTask && filteredSubtypes.length > 0 && !formData.taskSubtype) {
      showMessage('Vyberte také konkrétní typ úkolu (subtype).', 'error');
      return;
    }

    const payload: any = {
      date: formData.date,
      length: finalLength,
      summary: formData.summary,
      job_title_id: Number(formData.job_title_id),
    };

    if (formData.unknownTask) {
      payload.company_id = Number(formData.company_id);
    } else {
      payload.task_id = formData.task_id;
    }

    if (!formData.unknownTask && formData.taskSubtype) {
      payload.task_subtype = formData.taskSubtype;
    }

    try {
      await createReport(payload);

      const storedTimers = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
      const updatedTimers = storedTimers.filter(
        (timer: TaskTimer) => timer.task_id !== formData.task_id,
      );
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedTimers));

      const reportSummary = formData.summary;
      showMessage(`Výkaz "${reportSummary}" byl úspěšně vytvořen!`, 'success');

      if (!stayOnPage) {
        navigate('/my-reports');
      } else {
        setFormData({
          summary: '',
          length: '',
          date: new Date(),
          task_id: '',
          company_id: '',
          job_title_id: user?.job_title?.id?.toString() || '',
          showAllTasks: false,
          unknownTask: false,
          taskType: '',
          taskSubtype: '',
        });
      }
    } catch (error: any) {
      if (error?.message) {
        showMessage(error.message, 'error');
      } else {
        showMessage('Chyba při vytváření výkazu.', 'error');
      }
    }
  };

  return (
    <div className={styles.layoutContainer}>
      <Menu activeItem="/new-report" />
      <div className={styles.contentContainer}>
        <Header
          icon={faCirclePlus}
          title="Nový výkaz"
          backButton={
            fromDuplicate
              ? { link: '/my-reports', showOn: 'both' }
              : fromToggle
              ? { link: '/toggle', showOn: 'both' }
              : { link: '/my-reports' }
          }
        />
        <div className={styles.content}>
          {loadingData || reportLoading ? (
            <Loader isContentOnly />
          ) : (
            <>
              <form onSubmit={handleSubmit}>
                {formData.unknownTask ? (
                  <InputGroup
                    id="company_id"
                    label="Klient"
                    isSelect
                    icon={faBriefcase}
                    selectOptions={clients.map((client) => ({
                      value: client.id.toString(),
                      label: client.name,
                    }))}
                    value={formData.company_id || ''}
                    onSelectChange={(option) =>
                      handleInputChange('company_id', option?.value || '')
                    }
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
                      selectOptions={hierarchicalTaskOptions}
                      value={formData.task_id || ''}
                      onSelectChange={(option) => handleInputChange('task_id', option?.value || '')}
                      placeholder="Vyberte úkol..."
                      isLoading={isLoadingTasks}
                      loadingText="Načítám data..."
                    />
                    {filteredSubtypes.length > 0 && !formData.unknownTask && (
                      <InputGroup
                        id="taskSubtype"
                        icon={faQuestionCircle}
                        label="Co konkrétně"
                        isSelect
                        selectOptions={filteredSubtypes}
                        value={formData.taskSubtype || ''}
                        onSelectChange={(option) =>
                          handleInputChange('taskSubtype', option?.value || '')
                        }
                        placeholder="Vyberte konkrétní typ úkolu..."
                      />
                    )}
                  </>
                )}

                <div className={styles.checkboxContainer}>
                  {(user?.role.id === 1 || user?.role.id === 2) && !formData.unknownTask && (
                    <label className={styles.checkbox}>
                      <input
                        type="checkbox"
                        checked={formData.showAllTasks}
                        onChange={(e) => handleInputChange('showAllTasks', e.target.checked)}
                      />
                      Zobrazit všechny úkoly
                    </label>
                  )}
                  <label className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={formData.unknownTask}
                      onChange={(e) => handleInputChange('unknownTask', e.target.checked)}
                    />
                    Neznám úkol
                  </label>
                </div>

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
                  selectOptions={jobTitles.map((job) => ({
                    value: job.id.toString(),
                    label: job.name,
                  }))}
                  value={formData.job_title_id}
                  onSelectChange={(option) =>
                    handleInputChange('job_title_id', option?.value || '')
                  }
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
                    onBlur={handleBlur}
                    onFocus={() => setShowDropdown(true)}
                    required
                    autoComplete="off"
                  />
                  <div
                    className={classNames(styles.dropdown, {
                      [styles.expanded]: showDropdown,
                      [styles.collapsed]: !showDropdown,
                    })}
                  >
                    {defaultValues.map((val) => (
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

                {(user?.role?.id === 1 || user?.role?.id === 2) &&
                  (formData.task_id || formData.unknownTask || formData.company_id) && (
                    <Button type="button" className={styles.copyButton} onClick={handleCopyUrl}>
                      Zkopírovat odkaz na výkaz
                      <FontAwesomeIcon icon={faCopy} />
                    </Button>
                  )}

                <div className={styles.buttonContainer}>
                  <Button
                    className={styles.saveAndNext}
                    type="submit"
                    onClick={() => setStayOnPage(true)}
                  >
                    Uložit a přidat další
                    <FontAwesomeIcon icon={faSave} />
                  </Button>
                  <Button type="submit" onClick={() => setStayOnPage(false)}>
                    Uložit <FontAwesomeIcon icon={faSave} />
                  </Button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewReport;
