import React, {
  createContext,
  useCallback,
  useContext,
  useState,
  PropsWithChildren,
  useRef,
} from 'react';
import { useFetch } from '@/utils/useFetch';
import { useAuthContext } from '@/providers/AuthProvider';

// Interface pro report
export interface Report {
  id: string;
  approved: boolean;
  length: string;
  summary: string;
  task_subtype?: string;
  date: string;
  created_at: string;
  updated_at: string;
  task_id?: string;
  client_id?: number;
  user_id: number;
  job_title_id: number;
  company_id: number;
  user_name: string;
  job_title_name: string;
  task_name?: string;
  client_name?: string;
}

// Interface pro paginaci
interface Pagination {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

// Interface pro ReportContext
interface ReportContextProps {
  reports: Report[];
  loading: boolean;
  error: string | null;
  pagination: Pagination | null;
  totalHours: number | null;
  averageHours: number | null;

  fetchReports: (page?: number, perPage?: number, filters?: Record<string, any>) => Promise<void>;
  fetchReportById: (id: string) => Promise<any>;
  createReport: (data: Partial<Report>) => Promise<void>;
  updateReport: (id: string, data: Partial<Report>) => Promise<void>;
  assignTaskToUnknownReport: (
    id: string,
    data: { task_id: string; task_subtype?: string },
  ) => Promise<{ new_report_id: number }>;
  approveReports: (ids: string[]) => Promise<void>;
  deleteReport: (id: string) => Promise<void>;
  fetchMyReports: (page?: number, perPage?: number, filters?: Record<string, any>) => Promise<void>;
  exportReports: (filters?: Record<string, any>) => Promise<string | null>;
}

const ReportContext = createContext<ReportContextProps | undefined>(undefined);

// Poskytovatel ReportProvider
export const ReportProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const { user } = useAuthContext();

  // Stavové proměnné
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [totalHours, setTotalHours] = useState<number | null>(null);
  const [averageHours, setAverageHours] = useState<number | null>(null);

  const requestIdRef = useRef(0);

  const BASE_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  // Zachycení případných chyb při fetchi
  const useFetchWithError = async (url: string, method: string, body?: any) => {
    return await useFetch(url, method, body);
  };

  // Načtení reportů s volitelným filtrováním/stránkováním
  const fetchReports = useCallback(
    async (page = 1, perPage = 15, filters: Record<string, any> = {}) => {
      const localRequestId = ++requestIdRef.current;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          perPage: perPage.toString(),
          ...Object.keys(filters).reduce((acc, key) => {
            if (filters[key] !== undefined && filters[key] !== null) {
              acc[key] = String(filters[key]);
            }
            return acc;
          }, {} as Record<string, string>),
        });

        const data = await useFetchWithError(`${BASE_API_URL}/reports?${params.toString()}`, 'GET');
        if (localRequestId !== requestIdRef.current) return;

        setReports(data.data || []);
        setPagination({
          current_page: data.current_page,
          last_page: data.last_page,
          per_page: data.per_page || perPage,
          total: data.total || 0,
        });
        setTotalHours(data.total_hours || null);
        setAverageHours(data.average_hours || null);
      } catch {
        if (localRequestId === requestIdRef.current) {
          setError('Failed to fetch reports. Please try again.');
        }
      } finally {
        if (localRequestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [BASE_API_URL],
  );

  // Načtení reportů přihlášeného uživatele
  const fetchMyReports = useCallback(
    async (page = 1, perPage = 15, filters: Record<string, any> = {}) => {
      if (!user) {
        setError('User is not logged in.');
        return;
      }
      const userFilters = { ...filters, user: user.id };
      await fetchReports(page, perPage, userFilters);
    },
    [user, fetchReports],
  );

  // Načtení konkrétního reportu dle ID
  const fetchReportById = useCallback(
    async (id: string) => {
      const localRequestId = ++requestIdRef.current;
      setLoading(true);
      setError(null);
      try {
        const data = await useFetchWithError(`${BASE_API_URL}/reports/${id}`, 'GET');
        if (localRequestId !== requestIdRef.current) return null;
        return data || null;
      } catch {
        if (localRequestId === requestIdRef.current) {
          setError('Failed to fetch report by ID.');
        }
        return null;
      } finally {
        if (localRequestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [BASE_API_URL],
  );

  // Vytvoření nového reportu
  const createReport = useCallback(
    async (reportData: Partial<Report>) => {
      const localRequestId = ++requestIdRef.current;
      setLoading(true);
      setError(null);
      try {
        await useFetchWithError(`${BASE_API_URL}/reports`, 'POST', reportData);
        if (localRequestId !== requestIdRef.current) return;
        await fetchReports();
      } catch (err: any) {
        if (localRequestId === requestIdRef.current) {
          if (err?.message) setError(err.message);
          else setError('Failed to create report.');
        }
        throw err;
      } finally {
        if (localRequestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [BASE_API_URL, fetchReports],
  );

  // Úprava (update) reportu
  const updateReport = useCallback(
    async (id: string, reportData: Partial<Report>) => {
      const localRequestId = ++requestIdRef.current;
      setLoading(true);
      setError(null);
      try {
        await useFetchWithError(`${BASE_API_URL}/reports/${id}`, 'PUT', reportData);
        if (localRequestId !== requestIdRef.current) return;
        await fetchReports();
      } catch {
        if (localRequestId === requestIdRef.current) {
          setError('Failed to update report.');
        }
      } finally {
        if (localRequestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [BASE_API_URL, fetchReports],
  );

  // Přiřazení úkolu k původně "unknown" reportu
  const assignTaskToUnknownReport = useCallback(
    async (
      id: string,
      data: { task_id: string; task_subtype?: string },
    ): Promise<{ new_report_id: number }> => {
      const localRequestId = ++requestIdRef.current;
      setLoading(true);
      setError(null);
      try {
        const response = await useFetchWithError(
          `${BASE_API_URL}/reports/${id}/assign-task`,
          'PUT',
          data,
        );
        if (localRequestId !== requestIdRef.current) return { new_report_id: 0 };
        return response?.new_report_id
          ? { new_report_id: response.new_report_id }
          : { new_report_id: 0 };
      } catch (err: any) {
        if (localRequestId === requestIdRef.current) {
          setError(err?.message || 'Failed to assign task to unknown report.');
        }
        throw err;
      } finally {
        if (localRequestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [BASE_API_URL],
  );

  // Schválení více reportů (podle ID)
  const approveReports = useCallback(
    async (ids: string[]) => {
      const localRequestId = ++requestIdRef.current;
      setLoading(true);
      setError(null);
      try {
        await useFetchWithError(`${BASE_API_URL}/reports/approve`, 'POST', {
          for_approve: ids.join(','),
        });
        if (localRequestId !== requestIdRef.current) return;
      } catch {
        if (localRequestId === requestIdRef.current) {
          setError('Failed to approve reports.');
        }
      } finally {
        if (localRequestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [BASE_API_URL],
  );

  // Smazání reportu podle ID
  const deleteReport = useCallback(
    async (id: string) => {
      const localRequestId = ++requestIdRef.current;
      setLoading(true);
      setError(null);
      try {
        await useFetchWithError(`${BASE_API_URL}/reports/${id}`, 'DELETE');
        if (localRequestId !== requestIdRef.current) return;
      } catch {
        if (localRequestId === requestIdRef.current) {
          setError('Failed to delete report.');
        }
      } finally {
        if (localRequestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [BASE_API_URL],
  );

  // Export výkazů do Excelu
  const exportReports = useCallback(
    async (filters: Record<string, any> = {}): Promise<string | null> => {
      const localRequestId = ++requestIdRef.current;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams(
          Object.keys(filters).reduce((acc, key) => {
            if (filters[key] !== undefined && filters[key] !== null) {
              acc[key] = filters[key].toString();
            }
            return acc;
          }, {} as Record<string, string>),
        );
        const data = await useFetchWithError(
          `${BASE_API_URL}/exports/reports?${params.toString()}`,
          'GET',
        );
        if (localRequestId !== requestIdRef.current) return null;
        if (data?.url) return data.url;
        throw new Error('Export failed: no URL returned.');
      } catch {
        if (localRequestId === requestIdRef.current) {
          setError('Failed to export reports.');
        }
        return null;
      } finally {
        if (localRequestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [BASE_API_URL],
  );

  return (
    <ReportContext.Provider
      value={{
        reports,
        loading,
        error,
        pagination,
        totalHours,
        averageHours,
        fetchReports,
        fetchMyReports,
        fetchReportById,
        createReport,
        updateReport,
        approveReports,
        deleteReport,
        exportReports,
        assignTaskToUnknownReport,
      }}
    >
      {children}
    </ReportContext.Provider>
  );
};

// hook pro použití ReportContextu
export const useReportContext = () => {
  const context = useContext(ReportContext);
  if (!context) {
    throw new Error('useReportContext must be used within a ReportProvider');
  }
  return context;
};
