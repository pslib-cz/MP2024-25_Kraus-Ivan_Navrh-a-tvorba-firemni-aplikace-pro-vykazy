import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '@/providers/AuthProvider';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowAdmin?: boolean;
    allowManager?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
       children,
       allowAdmin = false,
       allowManager = false,
   }) => {
    const { user } = useAuthContext();
    const location = useLocation();


    if (!user) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    if (allowAdmin && user.role.id === 1) {
        return <>{children}</>;
    }
    if (allowManager && user.role.id === 2) {
        return <>{children}</>;
    }
    if (!allowAdmin && !allowManager) {
        return <>{children}</>;
    }

    return <Navigate to="/my-reports" replace />;
};

export default ProtectedRoute;
