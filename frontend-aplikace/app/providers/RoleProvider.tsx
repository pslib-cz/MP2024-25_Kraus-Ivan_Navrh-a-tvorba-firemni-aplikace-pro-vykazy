import React, { createContext, useContext, useEffect, useState } from 'react';
import { useFetch } from '@/utils/useFetch';
import { useAuthContext } from '@/providers/AuthProvider';
import { faCrown, faShieldAlt, faUser, faQuestion } from '@fortawesome/free-solid-svg-icons';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';

type RoleInfo = {
  id: number;
  name: string;
  icon: IconDefinition;
};

const roleIcons: Record<string, IconDefinition> = {
  admin: faCrown,
  supervisor: faShieldAlt,
  user: faUser,
};

const roleTranslations: Record<string, string> = {
  admin: 'Admin',
  supervisor: 'Manažer',
  user: 'Uživatel',
};

const RoleContext = createContext<{
  roles: RoleInfo[];
  loading: boolean;
  error: string | null;
}>(null!);

export const RoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthContext();
  const [roles, setRoles] = useState<RoleInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRoles = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const data = await useFetch('/roles', 'GET');
        const processedRoles = data.map((role: { id: number; name: string }) => {
          const lowerCaseName = role.name.toLowerCase();
          return {
            id: role.id,
            name: roleTranslations[lowerCaseName] || role.name,
            icon: roleIcons[lowerCaseName] || faQuestion,
          };
        });
        setRoles(processedRoles);
      } catch (err: any) {
        setError(err.message || 'Chyba při načítání rolí');
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, [user]);

  return <RoleContext.Provider value={{ roles, loading, error }}>{children}</RoleContext.Provider>;
};

export const useRoles = () => useContext(RoleContext);
