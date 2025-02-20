import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '@/providers/AuthProvider';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowAdmin?: boolean;
    allowSupervisor?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
       children,
       allowAdmin = false,
       allowSupervisor = false,
   }) => {
    const { user } = useAuthContext();
    const location = useLocation();


    if (!user) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    if (allowAdmin && user.role.id === 1) {
        return <>{children}</>;
    }
    if (allowSupervisor && user.role.id === 2) {
        return <>{children}</>;
    }
    if (!allowAdmin && !allowSupervisor) {
        return <>{children}</>;
    }

    return <Navigate to="/my-reports" replace />;
};

export default ProtectedRoute;
