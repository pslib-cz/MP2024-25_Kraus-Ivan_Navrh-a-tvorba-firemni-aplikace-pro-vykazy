import React, { createContext, useCallback, useContext, useState, PropsWithChildren } from 'react';
import { useFetch } from '@/utils/useFetch';

// Interface pro klienta
export interface Client {
  id: number;
  remote_id: number;
  pohoda_id: number;
  ico: string;
  name: string;
  role: string;
  notifications: number;
  created_at: string;
  updated_at: string;
}

interface ClientContextProps {
  clients: Client[];
  loading: boolean;
  error: string | null;
  fetchClients: () => Promise<void>;
  fetchClientById: (id: number) => Promise<Client | null>;
}

// Kontext pro data o klientech
const ClientContext = createContext<ClientContextProps | undefined>(undefined);

export const ClientsProvider: React.FC<PropsWithChildren> = ({ children }) => {
  // Seznam klientů a lokální stavy
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // URL pro API
  const BASE_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  // Načtení všech klientů
  const fetchClients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await useFetch(`${BASE_API_URL}/clients`, 'GET');
      setClients(data || []);
    } catch (err) {
      setError('Failed to fetch clients.');
    } finally {
      setLoading(false);
    }
  }, [BASE_API_URL]);

  // Načtení jednoho klienta podle ID
  const fetchClientById = useCallback(
    async (id: number): Promise<Client | null> => {
      setLoading(true);
      setError(null);
      try {
        const data = await useFetch(`${BASE_API_URL}/clients/${id}`, 'GET');
        return data || null;
      } catch (err) {
        setError('Failed to fetch client by ID.');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [BASE_API_URL],
  );

  // Poskytnutí hodnot a funkcí v kontextu
  return (
    <ClientContext.Provider value={{ clients, loading, error, fetchClients, fetchClientById }}>
      {children}
    </ClientContext.Provider>
  );
};

// Vlastní hook pro použití ClientContextu
export const useClientContext = () => {
  const context = useContext(ClientContext);
  if (!context) {
    throw new Error('useClientContext must be used within a ClientsProvider');
  }
  return context;
};
