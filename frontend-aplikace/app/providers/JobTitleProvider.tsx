import React, { createContext, useContext, useEffect, useState } from 'react';
import { useFetch } from '@/utils/useFetch';
import { useAuthContext } from '@/providers/AuthProvider';
import {
  faCode,
  faPenNib,
  faPaintBrush,
  faComments,
  faProjectDiagram,
  faChartLine,
  faHandshake,
  faQuestion,
} from '@fortawesome/free-solid-svg-icons';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';

type JobTitle = {
  id: number;
  name: string;
  icon: IconDefinition;
};

const jobIcons: Record<number, IconDefinition> = {
  1: faCode,
  2: faPenNib,
  3: faPaintBrush,
  4: faComments,
  5: faProjectDiagram,
  6: faChartLine,
  7: faHandshake,
};

const JobTitleContext = createContext<{
  jobTitles: JobTitle[];
  loading: boolean;
  error: string | null;
}>(null!);

export const JobTitleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthContext();
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchJobTitles = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const data = await useFetch('/job-titles', 'GET');
        const processedJobTitles = data.map((job: { id: number; name: string }) => ({
          id: job.id,
          name: job.name,
          icon: jobIcons[job.id] || faQuestion,
        }));
        setJobTitles(processedJobTitles);
      } catch (err: any) {
        setError(err.message || 'Chyba při načítání pracovních titulů');
      } finally {
        setLoading(false);
      }
    };

    fetchJobTitles();
  }, [user]);

  return (
    <JobTitleContext.Provider value={{ jobTitles, loading, error }}>
      {children}
    </JobTitleContext.Provider>
  );
};

export const useJobTitles = () => useContext(JobTitleContext);
