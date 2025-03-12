import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// Interface pro TaskTimer
export interface TaskTimer {
  id: string;
  task_id: string;
  timeSpent: number;
  isRunning: boolean;
  lastUpdate?: number;
  isPending?: boolean;
}

// Klíč pro ukládání timerů do localStorage
const LOCAL_STORAGE_KEY = 'timers';

// Interface pro TimerContext
interface TimerContextType {
  timers: TaskTimer[];
  startStopTimer: (id: string) => void;
  addTimer: () => void;
  deleteTimer: (id: string) => void;
  updateTimer: (id: string, updates: Partial<TaskTimer>) => void;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

interface TimerProviderProps {
  children: ReactNode;
}

// Provider TimerProvider
export const TimerProvider: React.FC<TimerProviderProps> = ({ children }) => {
  const [timers, setTimers] = useState<TaskTimer[]>([]);

  // Načtení timerů z localStorage při prvním renderu
  useEffect(() => {
    const storedTimers = localStorage.getItem(LOCAL_STORAGE_KEY);
    const currentTime = Date.now();

    if (storedTimers) {
      const parsedTimers: TaskTimer[] = JSON.parse(storedTimers);

      if (parsedTimers.length === 0) {
        setTimers([{ id: currentTime.toString(), task_id: '', timeSpent: 0, isRunning: false }]);
      } else {
        const updatedTimers = parsedTimers.map((timer) => {
          if (timer.isRunning && timer.lastUpdate) {
            const elapsedTime = Math.floor((currentTime - timer.lastUpdate) / 1000);
            return {
              ...timer,
              timeSpent: timer.timeSpent + elapsedTime,
              lastUpdate: currentTime,
            };
          }
          return timer;
        });
        setTimers(updatedTimers);
      }
    } else {
      setTimers([{ id: currentTime.toString(), task_id: '', timeSpent: 0, isRunning: false }]);
    }
  }, []);

  // Uložení timerů do localStorage při změně
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(timers));
  }, [timers]);

  // Přičítání času k timerům každou sekundu
  useEffect(() => {
    const interval = setInterval(() => {
      setTimers((prevTimers) =>
        prevTimers.map((timer) => {
          if (timer.isRunning) {
            return {
              ...timer,
              timeSpent: timer.timeSpent + 1,
              lastUpdate: Date.now(),
            };
          }
          return timer;
        }),
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Spuštění/zastavení timeru – zastaví všechny ostatní timery
  const startStopTimer = (id: string) => {
    setTimers((prevTimers) =>
      prevTimers.map((timer) => {
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

  // Přidání nového timeru
  const addTimer = () => {
    const newTimer: TaskTimer = {
      id: Date.now().toString(),
      task_id: '',
      timeSpent: 0,
      isRunning: false,
    };
    setTimers((prev) => [...prev, newTimer]);
  };

  // Smazání timeru podle id
  const deleteTimer = (id: string) => {
    setTimers((prev) => prev.filter((timer) => timer.id !== id));
  };

  // Úprava vlastností vybraného timeru
  const updateTimer = (id: string, updates: Partial<TaskTimer>) => {
    setTimers((prev) => prev.map((timer) => (timer.id === id ? { ...timer, ...updates } : timer)));
  };

  return (
    <TimerContext.Provider
      value={{
        timers,
        startStopTimer,
        addTimer,
        deleteTimer,
        updateTimer,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
};

// hook pro použití TimerContextu
export const useTimerContext = () => {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimerContext musí být použit uvnitř TimerProvideru');
  }
  return context;
};
