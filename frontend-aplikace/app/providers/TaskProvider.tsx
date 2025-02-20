import React, {
  createContext,
  useCallback,
  useContext,
  useState,
  PropsWithChildren,
  useEffect,
} from 'react';
import { useFetch } from '@/utils/useFetch';

export interface Task {
  code: string;
  remote_id: number;
  company_id: number;
  project_code: string | null;
  currency_code: string;
  name: string;
  description: string;
  type: string;
  type_id: number;
  phase: string;
  price: number;
  active_indefinite: boolean | null;
  active_current_month: boolean | null;
  d_from: string;
  d_to: string | null;
  d_win: string | null;
  pohoda_order_id: number | null;
  created_at: string;
  updated_at: string;
  client_name: string | null;
}

export interface TaskType {
  global: string[];
  brand: string[];
  product: string[];
  marketing: string[];
}

interface TasksContextProps {
  tasks: Task[];
  activeTasks: Task[];
  taskTypes: TaskType | null;
  loading: boolean;
  error: string | null;
  fetchTasks: (params?: Record<string, any>) => Promise<void>;
  fetchActiveTasks: () => Promise<void>;
  fetchTaskByCode: (code: string) => Promise<Task | null>;
  fetchTaskSubtypes: () => Promise<void>;
  fetchTasksByCompany: (companyId: string, showAll: boolean) => Promise<Task[]>;
}

const TasksContext = createContext<TasksContextProps | undefined>(undefined);

export const TaskProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTasks, setActiveTasks] = useState<Task[]>([]);
  const [taskTypes, setTaskTypes] = useState<TaskType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const BASE_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const fetchTasks = useCallback(
    async (params: Record<string, any> = {}) => {
      setLoading(true);
      setError(null);
      try {
        const query = new URLSearchParams(
          Object.keys(params).reduce((acc, key) => {
            if (params[key] !== undefined && params[key] !== null) {
              acc[key] = params[key].toString();
            }
            return acc;
          }, {} as Record<string, string>),
        );
        const data = await useFetch(`${BASE_API_URL}/tasks?${query.toString()}`, 'GET');
        setTasks(data || []);
      } catch (err) {
        setError('Failed to fetch tasks.');
      } finally {
        setLoading(false);
      }
    },
    [BASE_API_URL],
  );

  const fetchActiveTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await useFetch(`${BASE_API_URL}/tasks?active=true`, 'GET');
      setActiveTasks(data || []);
    } catch (err) {
      setError('Failed to fetch active tasks.');
    } finally {
      setLoading(false);
    }
  }, [BASE_API_URL]);

  const fetchTasksByCompany = useCallback(
    async (companyId: string, showAll: boolean): Promise<Task[]> => {
      setLoading(true);
      setError(null);
      try {
        const url = `${BASE_API_URL}/tasks?company_id=${companyId}&active=${!showAll}`;
        const data = await useFetch(url, 'GET');
        return data || [];
      } catch (err) {
        setError('Failed to fetch tasks by company.');
        return [];
      } finally {
        setLoading(false);
      }
    },
    [BASE_API_URL],
  );

  const fetchTaskByCode = useCallback(
    async (code: string): Promise<Task | null> => {
      setLoading(true);
      setError(null);
      try {
        const data = await useFetch(`${BASE_API_URL}/tasks/${code}`, 'GET');
        return data || null;
      } catch (err) {
        setError('Failed to fetch task by code.');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [BASE_API_URL],
  );

  const fetchTaskSubtypes = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const data = await useFetch(`${BASE_API_URL}/tasks/subtypes`, 'GET');
      if (data?.types) {
        setTaskTypes(data.types);
      } else {
        console.warn('Invalid data structure:', data);
      }
    } catch (err) {
      setError('Failed to fetch task subtypes.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [BASE_API_URL]);

  useEffect(() => {
    if (!taskTypes) {
      fetchTaskSubtypes();
    }
  }, [taskTypes, fetchTaskSubtypes]);

  return (
    <TasksContext.Provider
      value={{
        tasks,
        activeTasks,
        taskTypes,
        loading,
        error,
        fetchTasks,
        fetchActiveTasks,
        fetchTaskByCode,
        fetchTaskSubtypes,
        fetchTasksByCompany,
      }}
    >
      {children}
    </TasksContext.Provider>
  );
};

export const useTasksContext = () => {
  const context = useContext(TasksContext);
  if (!context) {
    throw new Error('useTasksContext must be used within a TaskProvider');
  }
  return context;
};
