import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../modules/core/AuthContext';
import { UserRole } from '../types';
import { Skeleton } from './Skeleton';

export interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md bg-white p-6 rounded-lg border border-slate-200 shadow-xs space-y-4">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    );
  }

  if (!user || !role) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    // Role mismatch: redirect to the user's role-appropriate home
    if (role === 'student') {
      return <Navigate to="/student/dashboard" replace />;
    } else if (role === 'teacher') {
      return <Navigate to="/teacher/dashboard" replace />;
    } else if (role === 'admin') {
      return <Navigate to="/admin/users" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
