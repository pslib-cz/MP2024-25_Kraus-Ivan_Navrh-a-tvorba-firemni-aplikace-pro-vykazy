import React, { useEffect, useState } from 'react';
import Menu from '../components/Menu';
import Header from '@/components/Header';
import InputGroup from '@/components/InputGroup';
import Button from '@/components/Button';
import Loader from '@/components/Loader';
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

export interface TaskTimer {
  id: string;
  task_id: string;
  timeSpent: number;
  isRunning: boolean;
  lastUpdate?: number;
  isPending?: boolean;
}

const LOCAL_STORAGE_KEY = 'timers';

const Toggle: React.FC = () => {
  const { fetchActiveTasks, activeTasks } = useTasksContext();
  const { fetchClients, clients } = useClientContext();
  const navigate = useNavigate();

  const [timers, setTimers] = useState<TaskTimer[]>([]);
  const [hierarchicalTaskOptions, setHierarchicalTaskOptions] = useState<
    {
      label: string;
      options: { value: string; label: string }[];
    }[]
  >([]);
  const [loadingData, setLoadingData] = useState(true);

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

    const storedTimers = localStorage.getItem(LOCAL_STORAGE_KEY);
    const currentTime = Date.now();

    if (storedTimers) {
      const parsedTimers: TaskTimer[] = JSON.parse(storedTimers);

      const updatedTimers = parsedTimers.map((timer) => {
        if (timer.isRunning && timer.lastUpdate) {
          const elapsedTime = Math.floor((currentTime - timer.lastUpdate) / 1000);
          return { ...timer, timeSpent: timer.timeSpent + elapsedTime, lastUpdate: currentTime };
        }
        return timer;
      });

      setTimers(
        updatedTimers.length > 0
          ? updatedTimers
          : [{ id: Date.now().toString(), task_id: '', timeSpent: 0, isRunning: false }],
      );
    } else {
      setTimers([{ id: Date.now().toString(), task_id: '', timeSpent: 0, isRunning: false }]);
    }
  }, [fetchActiveTasks, fetchClients]);

  useEffect(() => {
    if (!activeTasks.length || !clients.length) return;

    const groupedOptions = activeTasks.reduce((acc, task) => {
      const client = clients.find((client) => client.id === task.company_id);
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

  useEffect(() => {
    if (timers) {
      const currentTime = Date.now();
      const updatedTimers = timers.map((timer) => {
        if (timer.isRunning) {
          return { ...timer, lastUpdate: currentTime };
        }
        return { ...timer, lastUpdate: undefined };
      });

      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedTimers));
    }
  }, [timers]);

  const handleStartStop = (id: string) => {
    if (!timers) return;
    setTimers((prevTimers) =>
      prevTimers!.map((timer) => {
        if (timer.id !== id && timer.isRunning) {
          return { ...timer, isRunning: false, lastUpdate: undefined };
        }
        if (timer.id === id) {
          return { ...timer, isRunning: !timer.isRunning, lastUpdate: Date.now() };
        }
        return timer;
      }),
    );
  };

  useEffect(() => {
    if (!timers) return;
    const intervalIds: NodeJS.Timeout[] = [];

    timers.forEach((timer) => {
      if (timer.isRunning) {
        const interval = setInterval(() => {
          setTimers((prevTimers) =>
            prevTimers!.map((t) => (t.id === timer.id ? { ...t, timeSpent: t.timeSpent + 1 } : t)),
          );
        }, 1000);
        intervalIds.push(interval);
      }
    });

    return () => intervalIds.forEach((id) => clearInterval(id));
  }, [timers]);

  const handleAddTimer = () => {
    setTimers((prevTimers) => {
      const newTimer = {
        id: Date.now().toString(),
        task_id: '',
        timeSpent: 0,
        isRunning: false,
      };

      return prevTimers ? [...prevTimers, newTimer] : [newTimer];
    });
  };

  const handleDeleteTimer = (id: string) => {
    if (!timers) return;
    setTimers((prevTimers) => prevTimers!.filter((timer) => timer.id !== id));
  };

  const handleConfirm = (id: string) => {
    if (!timers) return;

    const timer = timers.find((t) => t.id === id);
    if (timer) {
      const roundedTime = (Math.ceil(timer.timeSpent / 900) * 0.25).toFixed(2);

      const queryParams = new URLSearchParams({
        task_id: timer.task_id,
        length: roundedTime,
        date: new Date().toISOString().split('T')[0],
        from: 'toggle',
      }).toString();

      navigate(`/new-report?${queryParams}`);
    }
  };

  const formatTime = (timeInSeconds: number) => {
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = timeInSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`;
  };

  if (timers === null) {
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
                      const flatOptions = hierarchicalTaskOptions.flatMap((group) => {
                        return group.options;
                      });

                      const selectedOption = flatOptions.find((option) => {
                        return String(option.value) === String(timer.task_id);
                      });
                      return selectedOption || undefined;
                    })()}
                    onSelectChange={(selectedOption) => {
                      setTimers((prevTimers) => {
                        return prevTimers.map((t) =>
                          t.id === timer.id
                            ? {
                                ...t,
                                task_id: selectedOption?.value || '',
                              }
                            : t,
                        );
                      });
                    }}
                    placeholder="Vyberte úkol..."
                  />

                  <div className={styles.timerControls}>
                    <div className={styles.timeControl}>
                      <span className={styles.timeDisplay}>{formatTime(timer.timeSpent)}</span>
                      <Button
                        icon={timer.isRunning ? faPause : faPlay}
                        onClick={() => handleStartStop(timer.id)}
                        disabled={!timer.task_id}
                        className={`${styles.playPauseButton} ${
                          !timer.task_id ? styles.disabled : ''
                        }`}
                      />
                    </div>
                    <div className={styles.buttons}>
                      <Button
                        icon={faTimes}
                        onClick={() => handleDeleteTimer(timer.id)}
                        disabled={timer.isRunning}
                        className={`${styles.deleteButton} ${
                          timer.isRunning ? styles.disabled : ''
                        }`}
                      />
                      <Button
                        icon={faCheck}
                        onClick={() => handleConfirm(timer.id)}
                        disabled={timer.isRunning || !timer.task_id || timer.timeSpent === 0}
                        className={`${styles.confirmButton} ${
                          timer.isRunning || !timer.task_id || timer.timeSpent === 0
                            ? styles.disabled
                            : ''
                        }`}
                      />
                    </div>
                  </div>
                </div>
              ))}
              <div className={styles.addButtonContainer}>
                <Button icon={faPlus} onClick={handleAddTimer} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Toggle;
