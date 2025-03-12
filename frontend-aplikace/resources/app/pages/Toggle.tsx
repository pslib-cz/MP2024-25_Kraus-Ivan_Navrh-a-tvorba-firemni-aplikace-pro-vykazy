import React, { useEffect, useState } from 'react';
import Menu from '../components/Menu';
import Header from '@/components/Header';
import InputGroup from '@/components/InputGroup';
import Button from '@/components/Button';
import Loader from '@/components/Loader';
import AlertModal from '@/components/AlertModal';
import { useTasksContext } from '@/providers/TaskProvider';
import { useClientContext } from '@/providers/ClientsProvider';
import { useNavigate } from 'react-router-dom';
import {
  faBriefcase,
  faCheck,
  faPause,
  faPlay,
  faPlus,
  faStopwatch,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';
import styles from './Toggle.module.scss';
import { useTimerContext, TaskTimer } from '@/providers/TimerProvider';

const Toggle: React.FC = () => {
  // Funkce z kontextů
  const { fetchActiveTasks, activeTasks } = useTasksContext();
  const { fetchClients, clients } = useClientContext();
  const navigate = useNavigate();

  // Funkce z TimerProvideru
  const { timers, startStopTimer, addTimer, deleteTimer, updateTimer } = useTimerContext();

  const [hierarchicalTaskOptions, setHierarchicalTaskOptions] = useState<
    { label: string; options: { value: string; label: string }[] }[]
  >([]);
  const [loadingData, setLoadingData] = useState(true);
  const [deleteModalTimerId, setDeleteModalTimerId] = useState<string | null>(null);

  // Načtení aktivních úkolů a klientů
  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      try {
        await Promise.all([fetchActiveTasks(), fetchClients()]);
      } catch (error) {
        console.error('Chyba při načítání dat:', error);
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, [fetchActiveTasks, fetchClients]);

  // Sestavení hierarchických options pro select
  useEffect(() => {
    if (!activeTasks.length || !clients.length) return;
    const groupedOptions = activeTasks.reduce((acc, task) => {
      const client = clients.find((c) => c.id === task.company_id);
      const clientName = client?.name || 'Neznámý klient';
      const taskOption = {
        value: task.code,
        label: `${clientName} - ${task.name || 'Neznámý úkol'}`,
      };
      const existingGroup = acc.find((group) => group.label === clientName);
      if (existingGroup) {
        existingGroup.options.push(taskOption);
      } else {
        acc.push({
          label: clientName,
          options: [taskOption],
        });
      }
      return acc;
    }, [] as { label: string; options: { value: string; label: string }[] }[]);
    setHierarchicalTaskOptions(groupedOptions);
  }, [activeTasks, clients]);

  // Smazání timeru
  const promptDeleteTimer = (id: string) => {
    const timer = timers.find((t: TaskTimer) => t.id === id);
    if (timer && timer.timeSpent > 0) {
      setDeleteModalTimerId(id);
    } else {
      confirmDeleteTimer(id);
    }
  };
  const confirmDeleteTimer = (id: string) => {
    deleteTimer(id);
    setDeleteModalTimerId(null);
  };

  // Defaultní zobrazení alespoň jednoho timeru
  useEffect(() => {
    if (timers.length === 0) {
      addTimer();
    }
  }, [timers, addTimer]);

  // Potvrzení timeru a přesměrování na nový výkaz
  const handleConfirm = (id: string) => {
    const timer = timers.find((t: TaskTimer) => t.id === id);
    if (timer) {
      const roundedTime = (Math.ceil(timer.timeSpent / 900) * 0.25).toFixed(2);
      const queryParams = new URLSearchParams({
        task_id: timer.task_id,
        length: roundedTime,
        date: new Date().toISOString().split('T')[0],
        from: 'toggle',
        timer_id: id,
      }).toString();
      navigate(`/new-report?${queryParams}`);
    }
  };

  // Formátování času
  const formatTime = (timeInSeconds: number) => {
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = timeInSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`;
  };

  if (!timers) {
    return <Loader isContentOnly />;
  }

  return (
    <div className={styles.layoutContainer}>
      <Menu activeItem="/toggle" />
      <div className={styles.contentContainer}>
        <Header icon={faStopwatch} title="Toggle" />
        <div className={styles.content}>
          {loadingData ? (
            <Loader isContentOnly />
          ) : (
            <div className={styles.toggleContainer}>
              {timers.map((timer) => (
                <div key={timer.id} className={styles.timerRow}>
                  <InputGroup
                    id={`task-select-${timer.id}`}
                    label="Vybrat úkol"
                    icon={faBriefcase}
                    className={styles.taskSelect}
                    isSelect
                    selectOptions={hierarchicalTaskOptions}
                    value={(() => {
                      const flatOptions = hierarchicalTaskOptions.flatMap((group) => group.options);
                      const selectedOption = flatOptions.find(
                        (option) => String(option.value) === String(timer.task_id),
                      );
                      return selectedOption || undefined;
                    })()}
                    onSelectChange={(selectedOption) => {
                      updateTimer(timer.id, { task_id: selectedOption?.value || '' });
                    }}
                    placeholder="Vyberte úkol..."
                  />

                  <div className={styles.timerControls}>
                    <div className={styles.timeControl}>
                      <span className={styles.timeDisplay}>{formatTime(timer.timeSpent)}</span>
                      <Button
                        icon={timer.isRunning ? faPause : faPlay}
                        onClick={() => startStopTimer(timer.id)}
                        disabled={!timer.task_id}
                        title={
                          timer.isRunning
                            ? 'Zastavit čas'
                            : timer.timeSpent === 0
                            ? 'Spustit čas'
                            : 'Pokračovat'
                        }
                        className={`${styles.playPauseButton} ${
                          !timer.task_id ? styles.disabled : ''
                        }`}
                      />
                    </div>

                    <div className={styles.buttons}>
                      <Button
                        icon={faTimes}
                        onClick={() => promptDeleteTimer(timer.id)}
                        disabled={timer.isRunning}
                        title="Smazat"
                        className={`${styles.deleteButton} ${
                          timer.isRunning ? styles.disabled : ''
                        }`}
                      />
                      <Button
                        icon={faCheck}
                        onClick={() => handleConfirm(timer.id)}
                        title="Potvrdit"
                        disabled={timer.isRunning || !timer.task_id || timer.timeSpent === 0}
                        className={`${
                          timer.isRunning || !timer.task_id || timer.timeSpent === 0
                            ? styles.disabled
                            : styles.confirmButton
                        }`}
                      />
                    </div>
                  </div>
                </div>
              ))}

              <div className={styles.addButtonContainer}>
                <Button title="Přidat úkol" icon={faPlus} onClick={addTimer} />
              </div>
            </div>
          )}
        </div>
      </div>

      {deleteModalTimerId && (
        <AlertModal
          title="Potvrzení smazání"
          message="Opravdu chcete smazat měření?"
          onConfirm={() => confirmDeleteTimer(deleteModalTimerId)}
          onCancel={() => setDeleteModalTimerId(null)}
        />
      )}
    </div>
  );
};

export default Toggle;
