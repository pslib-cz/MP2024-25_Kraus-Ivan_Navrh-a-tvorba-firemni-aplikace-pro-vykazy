import React, {
  createContext,
  useReducer,
  useContext,
  useCallback,
  useState,
  useRef,
  PropsWithChildren,
} from 'react';
import { BASE_API_URL } from '@/utils/config';
import { useFetch } from '@/utils/useFetch';

// Typ uživatele
export type User = {
  id: number;
  name: string;
  email: string;
  role: { id: number; name: string };
  job_title?: { id: number; name: string } | null;
  supervisor?: { id: number; name: string } | null;
  auto_approved: boolean;
  ms_id?: string;
  avatar?: string;
  deleted_at?: string | null;
};

// Interface pro stránkování
interface Pagination {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

const initialState = {
  users: [] as User[],
  pagination: null as Pagination | null,
};

// Typy akcí pro reducer
export enum UsersActionTypes {
  SET_USERS = 'SET_USERS',
  ADD_USER = 'ADD_USER',
  UPDATE_USER = 'UPDATE_USER',
  DELETE_USER = 'DELETE_USER',
}

type UsersAction =
  | {
      type: UsersActionTypes.SET_USERS;
      payload: { users: User[]; pagination: Pagination };
    }
  | { type: UsersActionTypes.ADD_USER; payload: User }
  | { type: UsersActionTypes.UPDATE_USER; payload: User }
  | { type: UsersActionTypes.DELETE_USER; payload: number };

interface UsersState {
  users: User[];
  pagination: Pagination | null;
}

// Reducer pro správu stavů uživatelů
const usersReducer = (state: UsersState, action: UsersAction): UsersState => {
  switch (action.type) {
    case UsersActionTypes.SET_USERS:
      return {
        ...state,
        users: action.payload.users,
        pagination: action.payload.pagination,
      };
    case UsersActionTypes.ADD_USER:
      return {
        ...state,
        users: [...state.users, action.payload],
      };
    case UsersActionTypes.UPDATE_USER:
      return {
        ...state,
        users: state.users.map((user) => (user.id === action.payload.id ? action.payload : user)),
      };
    case UsersActionTypes.DELETE_USER:
      return {
        ...state,
        users: state.users.filter((user) => user.id !== action.payload),
      };
    default:
      return state;
  }
};

// Kontext pro správu uživatelů
const UsersContext = createContext<{
  users: User[];
  pagination: Pagination | null;
  loading: boolean;
  fetchUsers: (
    page?: number,
    perPage?: number,
    filters?: Record<string, any>,
    sort?: { columns: string[]; orders: ('asc' | 'desc')[] },
    fetchAll?: boolean,
  ) => Promise<void>;
  fetchSupervisors: () => Promise<User[]>;
  fetchUserById: (userId: number) => Promise<User>;
  addUser: (
    user: Partial<User> & {
      password: string;
      password_confirmation: string;
      role_id: number;
      job_title_id: number;
      supervisor_id?: number | null;
    },
  ) => Promise<void>;
  updateUser: (userId: number, user: Partial<User>) => Promise<void>;
  deleteUser: (userId: number) => Promise<void>;
} | null>(null);

// Poskytovatel UserProvider
export const UserProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [state, dispatch] = useReducer(usersReducer, initialState);
  const [loading, setLoading] = useState(false);
  const requestIdRef = useRef(0);

  // Načtení uživatelů (volitelně s filtrem, řazením, stránkováním)
  const fetchUsers = useCallback(
    async (
      page: number = 1,
      perPage: number = 10,
      filters: Record<string, any> = {},
      sort: { columns?: string[]; orders?: ('asc' | 'desc')[] } = {},
      fetchAll: boolean = false,
    ) => {
      const localRequestId = ++requestIdRef.current;
      setLoading(true);

      try {
        const allUsers: User[] = [];
        let currentPage = page;
        let lastPage = 1;

        filters.active = 'true';

        do {
          if (localRequestId !== requestIdRef.current) {
            return;
          }

          const queryParams = {
            page: currentPage.toString(),
            per_page: perPage.toString(),
            ...filters,
            sort_columns: Array.isArray(sort.columns) ? sort.columns.join(',') : '',
            sort_orders: Array.isArray(sort.orders) ? sort.orders.join(',') : '',
          };

          const filteredParams = Object.fromEntries(
            Object.entries(queryParams)
              .filter(([_, value]) => value !== undefined && value !== null && value !== '')
              .map(([key, value]) => [key, String(value)]),
          );

          const query = new URLSearchParams(filteredParams).toString();

          const response = await useFetch(`${BASE_API_URL}/users?${query}`, 'GET');

          if (localRequestId !== requestIdRef.current) {
            return;
          }

          if (response?.errors) {
            const serverErrors = Object.values(response.errors).flat().join(' ');
            throw new Error(serverErrors);
          }

          if (response?.data) {
            const usersWithDeletedAt = response.data.map((user: any) => ({
              ...user,
              deleted_at: user.deleted_at || null,
            }));

            allUsers.push(...usersWithDeletedAt);

            currentPage = response.meta.current_page + 1;
            lastPage = response.meta.last_page;
          } else {
            break;
          }
        } while (fetchAll && currentPage <= lastPage);

        if (localRequestId !== requestIdRef.current) {
          return;
        }

        dispatch({
          type: UsersActionTypes.SET_USERS,
          payload: {
            users: allUsers,
            pagination: fetchAll
              ? {
                  current_page: 1,
                  last_page: 1,
                  per_page: allUsers.length,
                  total: allUsers.length,
                }
              : {
                  current_page: page,
                  last_page: lastPage,
                  per_page: perPage,
                  total: allUsers.length,
                },
          },
        });
      } catch (error: any) {
        throw error;
      } finally {
        if (localRequestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [],
  );

  // Načtení seznamu nadřízených uživatelů
  const fetchSupervisors = useCallback(async (): Promise<User[]> => {
    try {
      return await useFetch(`${BASE_API_URL}/users/supervisors`, 'GET');
    } catch {
      return [];
    }
  }, []);

  // Načtení konkrétního uživatele podle ID
  const fetchUserById = useCallback(async (userId: number): Promise<User> => {
    try {
      return await useFetch(`${BASE_API_URL}/users/${userId}`, 'GET');
    } catch (error) {
      throw error;
    }
  }, []);

  // Vytvoření nového uživatele
  const addUser = useCallback(
    async (
      user: Partial<User> & {
        password: string;
        password_confirmation: string;
        role_id: number;
        job_title_id: number;
        supervisor_id?: number | null;
      },
    ) => {
      try {
        const newUser = await useFetch(`${BASE_API_URL}/users`, 'POST', user);
        dispatch({ type: UsersActionTypes.ADD_USER, payload: newUser });
      } catch (error: any) {
        if (error?.errors) {
          throw error.errors;
        } else if (error?.message) {
          throw new Error(error.message);
        } else {
          throw new Error('Neznámá chyba při vytváření uživatele.');
        }
      }
    },
    [],
  );

  // Úprava existujícího uživatele
  const updateUser = useCallback(async (userId: number, user: Partial<User>) => {
    try {
      const response = await useFetch(`${BASE_API_URL}/users/${userId}`, 'PUT', user);
      if (response?.errors) {
        const serverErrors = Object.values(response.errors).flat().join(' ');
        throw new Error(serverErrors);
      }
      dispatch({ type: UsersActionTypes.UPDATE_USER, payload: response });
    } catch (error: any) {
      throw error;
    }
  }, []);

  // Smazání uživatele
  const deleteUser = useCallback(async (userId: number) => {
    try {
      const response = await useFetch(`${BASE_API_URL}/users/${userId}`, 'DELETE');
      if (response?.errors) {
        const serverErrors = Object.values(response.errors).flat().join(' ');
        throw new Error(serverErrors);
      }
      dispatch({ type: UsersActionTypes.DELETE_USER, payload: userId });
    } catch (error: any) {
      throw error;
    }
  }, []);

  return (
    <UsersContext.Provider
      value={{
        users: state.users,
        pagination: state.pagination,
        loading,
        fetchUsers,
        fetchSupervisors,
        fetchUserById,
        addUser,
        updateUser,
        deleteUser,
      }}
    >
      {children}
    </UsersContext.Provider>
  );
};

// hook pro kontext
export const useUsersContext = () => {
  const context = useContext(UsersContext);
  if (!context) {
    throw new Error('useUsersContext must be used within a UserProvider');
  }
  return context;
};

export default UserProvider;
