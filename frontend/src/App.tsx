import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Calls from './pages/Calls';
import CallDetail from './pages/CallDetail';
import Transcription from './pages/Transcription';
import Criteria from './pages/Criteria';
import Users from './pages/Users';
import Register from './pages/Register';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Companies from './pages/Companies';
import Contacts from './pages/Contacts';
import UserScores from './pages/UserScores';
import ScoreEvolution from './pages/ScoreEvolution';
import CallsByPeriod from './pages/CallsByPeriod';
import RiskWordsCalls from './pages/RiskWordsCalls';
import ContactReasons from './pages/ContactReasons';
import ObjectionReasons from './pages/ObjectionReasons';
import { isAdminOrDeveloper, isDeveloper } from './types';
import './i18n';

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Pass the current location so we can redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Layout>{children}</Layout>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Pass the current location so we can redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Developer and admin_manager have access
  if (!user?.role || !isAdminOrDeveloper(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Layout>{children}</Layout>;
}

function DeveloperRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Only developer has access
  if (!user?.role || !isDeveloper(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Layout>{children}</Layout>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PublicRoute>
            <ForgotPassword />
          </PublicRoute>
        }
      />
      <Route
        path="/reset-password"
        element={
          <PublicRoute>
            <ResetPassword />
          </PublicRoute>
        }
      />
      {/* Register is always accessible - user can register even if logged in */}
      <Route path="/register" element={<Register />} />

      {/* Protected routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* Calls routes */}
      <Route
        path="/calls"
        element={
          <ProtectedRoute>
            <Calls />
          </ProtectedRoute>
        }
      />
      <Route
        path="/calls/:id"
        element={
          <ProtectedRoute>
            <CallDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/calls/:id/transcription"
        element={
          <ProtectedRoute>
            <Transcription />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <AdminRoute>
            <Reports />
          </AdminRoute>
        }
      />
      <Route
        path="/user-scores"
        element={
          <AdminRoute>
            <UserScores />
          </AdminRoute>
        }
      />
      <Route
        path="/score-evolution"
        element={
          <AdminRoute>
            <ScoreEvolution />
          </AdminRoute>
        }
      />
      <Route
        path="/calls-by-period"
        element={
          <AdminRoute>
            <CallsByPeriod />
          </AdminRoute>
        }
      />
      <Route
        path="/risk-words-calls"
        element={
          <AdminRoute>
            <RiskWordsCalls />
          </AdminRoute>
        }
      />
      <Route
        path="/contact-reasons"
        element={
          <AdminRoute>
            <ContactReasons />
          </AdminRoute>
        }
      />
      <Route
        path="/objection-reasons"
        element={
          <AdminRoute>
            <ObjectionReasons />
          </AdminRoute>
        }
      />
      <Route
        path="/criteria"
        element={
          <AdminRoute>
            <Criteria />
          </AdminRoute>
        }
      />
      <Route
        path="/users"
        element={
          <AdminRoute>
            <Users />
          </AdminRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/contacts"
        element={
          <ProtectedRoute>
            <Contacts />
          </ProtectedRoute>
        }
      />

      {/* Developer only routes */}
      <Route
        path="/companies"
        element={
          <DeveloperRoute>
            <Companies />
          </DeveloperRoute>
        }
      />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
          <Toaster position="top-right" />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
