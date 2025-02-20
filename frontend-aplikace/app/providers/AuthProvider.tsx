import React, { createContext, useReducer, useContext, PropsWithChildren } from 'react';
import { BASE_API_URL } from '@/utils/config';
import { useFetch } from '@/utils/useFetch';

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: {
    id: number;
    name: string;
  };
  job_title: {
    id: number;
    name: string;
  };
  supervisor?: {
    id: number;
    name: string;
  } | null;
  auto_approved: boolean;
  show_all_tasks: boolean;
  ms_id?: string;
  avatar?: string;
};

const initialAuthUser: AuthUser | null = null;

export enum AuthActionTypes {
  LOGIN,
  LOGOUT,
  UPDATE_USER,
  TOGGLE_SHOW_ALL_TASKS,
}

export type AuthAction =
  | { type: AuthActionTypes.LOGIN; payload: AuthUser }
  | { type: AuthActionTypes.LOGOUT }
  | { type: AuthActionTypes.UPDATE_USER; payload: Partial<AuthUser> }
  | { type: AuthActionTypes.TOGGLE_SHOW_ALL_TASKS; payload: boolean };

const authReducer = (state: AuthUser | null, action: AuthAction): AuthUser | null => {
  switch (action.type) {
    case AuthActionTypes.LOGIN:
      return { ...action.payload };
    case AuthActionTypes.LOGOUT:
      return null;
    case AuthActionTypes.UPDATE_USER:
      return state
        ? { ...state, ...action.payload, avatar: action.payload.avatar || state.avatar }
        : null;
    case AuthActionTypes.TOGGLE_SHOW_ALL_TASKS:
      return state ? { ...state, show_all_tasks: action.payload } : null;
    default:
      return state;
  }
};

const AuthContext = createContext<{
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUserFromStorage: () => void;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (
    email: string,
    password: string,
    passwordConfirmation: string,
    token: string,
  ) => Promise<void>;
  msLogin: () => Promise<void>;
  connectMsAccount: () => Promise<void>;
  disconnectMsAccount: () => Promise<void>;
  toggleShowAllTasks: (value: boolean) => void;
  dispatch: React.Dispatch<AuthAction>;
}>(null!);

export const AuthProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [user, dispatch] = useReducer(authReducer, initialAuthUser);

  const login = async (email: string, password: string) => {
    try {
      await useFetch(`${BASE_API_URL}/auth/login`, 'POST', { email, password });

      const userData = await useFetch(`${BASE_API_URL}/users/me`, 'GET');

      const storageKey = `showAllTasks_${userData.id}`;
      const storedShowAllTasks = localStorage.getItem(storageKey);
      const showAllTasks = storedShowAllTasks ? JSON.parse(storedShowAllTasks) : false;

      dispatch({
        type: AuthActionTypes.LOGIN,
        payload: { ...userData, show_all_tasks: showAllTasks },
      });
    } catch (error: any) {
      console.error('Chyba při přihlášení:', error.message);
      throw error;
    }
  };

  const toggleShowAllTasks = (value: boolean) => {
    if (user) {
      const storageKey = `showAllTasks_${user.id}`;

      if (value) {
        localStorage.setItem(storageKey, JSON.stringify(value));
      } else {
        localStorage.removeItem(storageKey);
      }

      dispatch({
        type: AuthActionTypes.TOGGLE_SHOW_ALL_TASKS,
        payload: value,
      });
    }
  };

  const logout = async () => {
    try {
      await useFetch(`${BASE_API_URL}/auth/logout`, 'POST', {});
      dispatch({ type: AuthActionTypes.LOGOUT });
    } catch (error: any) {
      console.error('Chyba při odhlášení:', error.message);
      throw error;
    }
  };

  const msLogin = async () => {
    const handleMsLogin = async (params: string) => {
      try {
        await useFetch(`${BASE_API_URL}/auth/ms-login?${params}`, 'GET');

        const userData = await useFetch(`${BASE_API_URL}/users/me`, 'GET');

        dispatch({
          type: AuthActionTypes.LOGIN,
          payload: {
            ...userData,
          },
        });
      } catch (error: any) {
        console.error('Chyba při Microsoft loginu:', error.message);
        throw error;
      }
    };

    const handleMsLoginPopup = () => {
      const position = {
        top: window.outerHeight / 2 - 300,
        left: window.outerWidth / 2 - 250,
      };

      const popupParams = `scrollbars=no,resizable=no,status=no,location=no,toolbar=no,menubar=no,width=500,height=600,left=${position.left},top=${position.top}`;
      const popupWindow = window.open(
        `${BASE_API_URL}/auth/ms-login/link`,
        'MS login',
        popupParams,
      );

      return new Promise<void>((resolve, reject) => {
        const interval = setInterval(() => {
          if (!popupWindow) return;
          if (!popupWindow.window) {
            clearInterval(interval);
            reject(new Error('Popup se nepodařilo otevřít.'));
            return;
          }

          try {
            if (popupWindow.location.href.includes('code=')) {
              const params = popupWindow.location.href.split('?')[1];
              popupWindow.close();
              clearInterval(interval);
              handleMsLogin(params).then(resolve).catch(reject);
              return;
            }

            if (!popupWindow || popupWindow.closed) {
              clearInterval(interval);
              reject(new Error('Popup byl zavřen uživatelem.'));
            }
          } catch (error) {}
        }, 500);
      });
    };

    return handleMsLoginPopup();
  };

  const connectMsAccount = async () => {
    const openPopupAndGetParams = (): Promise<{ code: string; state: string }> => {
      return new Promise((resolve, reject) => {
        const position = {
          top: window.outerHeight / 2 - 300,
          left: window.outerWidth / 2 - 250,
        };

        const popupParams = `scrollbars=no,resizable=no,status=no,location=no,toolbar=no,menubar=no,width=500,height=600,left=${position.left},top=${position.top}`;
        const popup = window.open(
          `${BASE_API_URL}/auth/ms-login/link`,
          'Microsoft Login',
          popupParams,
        );

        if (!popup) {
          reject(new Error('Nepodařilo se otevřít popup okno.'));
          return;
        }

        const interval = setInterval(() => {
          try {
            if (!popup || popup.closed) {
              clearInterval(interval);
              reject(new Error('Popup byl zavřen uživatelem.'));
              return;
            }

            const popupUrl = new URL(popup.location.href);
            const code = popupUrl.searchParams.get('code');
            const state = popupUrl.searchParams.get('state');

            if (code && state) {
              clearInterval(interval);
              popup.close();
              resolve({ code, state });
            }
          } catch (error) {}
        }, 500);
      });
    };

    try {
      const { code, state } = await openPopupAndGetParams();
      await useFetch(
        `${BASE_API_URL}/users/me/settings/ms?code=${encodeURIComponent(
          code,
        )}&state=${encodeURIComponent(state)}`,
        'PUT',
        {},
      );
    } catch (error: any) {
      console.error('Chyba při propojení Microsoft účtu:', error.message || error);
      throw error;
    }
  };

  const disconnectMsAccount = async () => {
    try {
      await useFetch(`${BASE_API_URL}/users/me/settings/ms`, 'DELETE', {});
    } catch (error: any) {
      throw error;
    }
  };

  const forgotPassword = async (email: string) => {
    await useFetch(`${BASE_API_URL}/auth/forgot-password`, 'POST', { email });
  };

  const resetPassword = async (
    email: string,
    password: string,
    passwordConfirmation: string,
    token: string,
  ) => {
    try {
      return await useFetch(`${BASE_API_URL}/auth/reset-password`, 'POST', {
        email,
        password,
        password_confirmation: passwordConfirmation,
        token,
      });
    } catch (error) {
      throw error;
    }
  };

  const loadUserFromStorage = async () => {
    try {
      const userData = await useFetch(`${BASE_API_URL}/users/me`, 'GET');
      const storageKey = `showAllTasks_${userData.id}`;
      const storedShowAllTasks = localStorage.getItem(storageKey);
      const showAllTasks = storedShowAllTasks ? JSON.parse(storedShowAllTasks) : false;

      dispatch({
        type: AuthActionTypes.LOGIN,
        payload: { ...userData, show_all_tasks: showAllTasks },
      });
    } catch (error) {
      console.warn('Žádný přihlášený uživatel nebyl nalezen.');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        loadUserFromStorage,
        forgotPassword,
        resetPassword,
        msLogin,
        connectMsAccount,
        disconnectMsAccount,
        toggleShowAllTasks,
        dispatch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => useContext(AuthContext);

export default AuthProvider;
