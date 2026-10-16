import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './modules/core/AuthContext';
import { ToastProvider } from './shared/ui/Toast';
import { ProtectedRoute } from './shared/ui/ProtectedRoute';
import { AppShell } from './shared/ui/AppShell';
import { testConnection } from './shared/firebase';

// Public Auth Pages
import { LandingPage } from './modules/core/pages/LandingPage';
import { LoginPage } from './modules/core/pages/LoginPage';
import { RegisterPage } from './modules/core/pages/RegisterPage';
import { ActivatePage } from './modules/core/pages/ActivatePage';
import { ForgotPasswordPage } from './modules/core/pages/ForgotPasswordPage';
import { ResetPasswordPage } from './modules/core/pages/ResetPasswordPage';

// Student Pages
import { StudentDashboardPage } from './modules/student/pages/StudentDashboardPage';
import { StudentCoursesPage } from './modules/student/pages/StudentCoursesPage';
import { StudentAttendancePage } from './modules/student/pages/StudentAttendancePage';
import { StudentMarksPage } from './modules/student/pages/StudentMarksPage';
import { StudentPerformancePage } from './modules/student/pages/StudentPerformancePage';
import { StudentProfilePage } from './modules/student/pages/StudentProfilePage';
import { StudentNotificationsPage } from './modules/risk/pages/StudentNotificationsPage';

// Teacher Pages
import { TeacherDashboardPage } from './modules/teacher/pages/TeacherDashboardPage';
import { TeacherStudentsPage } from './modules/teacher/pages/TeacherStudentsPage';
import { StudentDetailPage } from './modules/teacher/pages/StudentDetailPage';
import { TeacherInterventionsPage } from './modules/teacher/pages/TeacherInterventionsPage';

// Admin Pages
import { AdminUsersPage } from './modules/admin/pages/AdminUsersPage';

/**
 * Root index redirector based on authentication and active role
 */
const RootRedirect: React.FC = () => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-xs text-slate-500 font-medium">Initializing workspace...</div>
      </div>
    );
  }

  if (!user || !role) {
    return <LandingPage />;
  }

  if (role === 'student') {
    return <Navigate to="/student/dashboard" replace />;
  } else if (role === 'teacher') {
    return <Navigate to="/teacher/dashboard" replace />;
  } else if (role === 'admin') {
    return <Navigate to="/admin/users" replace />;
  }

  return <Navigate to="/login" replace />;
};

export default function App() {
  useEffect(() => {
    testConnection();
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public Unauthenticated Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/activate" element={<ActivatePage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Student Protected Routes */}
            <Route
              path="/student/*"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <AppShell>
                    <Routes>
                      <Route path="dashboard" element={<StudentDashboardPage />} />
                      <Route path="courses" element={<StudentCoursesPage />} />
                      <Route path="attendance" element={<StudentAttendancePage />} />
                      <Route path="marks" element={<StudentMarksPage />} />
                      <Route path="performance" element={<StudentPerformancePage />} />
                      <Route path="notifications" element={<StudentNotificationsPage />} />
                      <Route path="profile" element={<StudentProfilePage />} />
                      <Route path="*" element={<Navigate to="/student/dashboard" replace />} />
                    </Routes>
                  </AppShell>
                </ProtectedRoute>
              }
            />

            {/* Teacher Protected Routes */}
            <Route
              path="/teacher/*"
              element={
                <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                  <AppShell>
                    <Routes>
                      <Route path="dashboard" element={<TeacherDashboardPage />} />
                      <Route path="students" element={<TeacherStudentsPage />} />
                      <Route path="students/:id" element={<StudentDetailPage />} />
                      <Route path="interventions" element={<TeacherInterventionsPage />} />
                      <Route path="*" element={<Navigate to="/teacher/dashboard" replace />} />
                    </Routes>
                  </AppShell>
                </ProtectedRoute>
              }
            />

            {/* Admin Protected Routes */}
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AppShell>
                    <Routes>
                      <Route path="users" element={<AdminUsersPage />} />
                      <Route path="*" element={<Navigate to="/admin/users" replace />} />
                    </Routes>
                  </AppShell>
                </ProtectedRoute>
              }
            />

            {/* Root & Catch-all */}
            <Route path="/" element={<RootRedirect />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
