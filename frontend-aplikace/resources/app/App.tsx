import './App.scss';
import {
  Route,
  RouterProvider,
  createBrowserRouter,
  createRoutesFromElements,
  Navigate,
} from 'react-router-dom';
import { useEffect, useState } from 'react';
import Login from './pages/LoginPage';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import MyReports from './pages/MyReports';
import NewReport from './pages/NewReport';
import AllReports from './pages/AllReports';
import Standup from './pages/Standup';
import Toggle from './pages/Toggle';
import MyProfile from './pages/MyProfile';
import { useAuthContext } from './providers/AuthProvider';
import AllUsers from './pages/AllUsers';
import More from './pages/More';
import Loader from './components/Loader';
import './components/ReactSelect.scss';
import NetworkStatus from './components/NetworkStatus';
import ProtectedRoute from './components/ProtectedRoute';
import NewUser from '@/pages/NewUser';
import EditUser from '@/pages/EditUser';
import EditReport from '@/pages/EditReport';

import { TimerProvider } from './providers/TimerProvider';
import { MessageProvider } from './providers/MessageProvider';

import TimerStatusMessage from './components/TimerStatusMessage';

function App() {
  const { user, loadUserFromStorage } = useAuthContext();
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    const initUser = async () => {
      await loadUserFromStorage();
      setLoadingUser(false);
    };
    initUser();
  }, []);

  const router = createBrowserRouter(
    createRoutesFromElements(
      <>
        {/* Veřejné stránky */}
        <Route path="/login" element={loadingUser ? <Loader /> : <Login />} />
        <Route path="/forgot-password" element={loadingUser ? <Loader /> : <ForgotPassword />} />
        <Route path="/reset-password" element={loadingUser ? <Loader /> : <ResetPassword />} />

        {/* Chráněné stránky pro běžné uživatele */}
        <Route
          path="/my-reports"
          element={<ProtectedRoute>{loadingUser ? <Loader /> : <MyReports />}</ProtectedRoute>}
        />
        <Route
          path="/new-report"
          element={<ProtectedRoute>{loadingUser ? <Loader /> : <NewReport />}</ProtectedRoute>}
        />
        <Route
          path="/standup"
          element={<ProtectedRoute>{loadingUser ? <Loader /> : <Standup />}</ProtectedRoute>}
        />
        <Route
          path="/toggle"
          element={<ProtectedRoute>{loadingUser ? <Loader /> : <Toggle />}</ProtectedRoute>}
        />
        <Route
          path="/my-profile"
          element={<ProtectedRoute>{loadingUser ? <Loader /> : <MyProfile />}</ProtectedRoute>}
        />
        <Route
          path="/more"
          element={<ProtectedRoute>{loadingUser ? <Loader /> : <More />}</ProtectedRoute>}
        />

        {/* Chráněné stránky pro admina a manažera */}
        <Route
          path="/all-reports"
          element={
            <ProtectedRoute allowAdmin allowManager>
              {loadingUser ? <Loader /> : <AllReports />}
            </ProtectedRoute>
          }
        />
        <Route
          path="/all-users"
          element={
            <ProtectedRoute allowAdmin allowManager>
              {loadingUser ? <Loader /> : <AllUsers />}
            </ProtectedRoute>
          }
        />
        <Route
          path="/new-user"
          element={
            <ProtectedRoute allowAdmin allowManager>
              {loadingUser ? <Loader /> : <NewUser />}
            </ProtectedRoute>
          }
        />
        <Route
          path="/edit-user/:id"
          element={
            <ProtectedRoute allowAdmin allowManager>
              {loadingUser ? <Loader /> : <EditUser />}
            </ProtectedRoute>
          }
        />
        <Route
          path="/edit-report/:id"
          element={<ProtectedRoute>{loadingUser ? <Loader /> : <EditReport />}</ProtectedRoute>}
        />

        {/* Výchozí přesměrování */}
        <Route
          path="/"
          element={
            loadingUser ? <Loader /> : <Navigate to={user ? '/my-reports' : '/login'} replace />
          }
        />

        {/* 404 fallback */}
        <Route
          path="*"
          element={
            loadingUser ? <Loader /> : <Navigate to={user ? '/my-reports' : '/login'} replace />
          }
        />
      </>,
    ),
  );

  return (
    <TimerProvider>
      <MessageProvider>
        <NetworkStatus />
        <TimerStatusMessage />
        {loadingUser ? <Loader /> : <RouterProvider router={router} />}
      </MessageProvider>
    </TimerProvider>
  );
}

export default App;
