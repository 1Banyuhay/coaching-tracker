import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './hooks/useAuth';
import ProtectedRoute from './components/Layout/ProtectedRoute';
import Navbar from './components/Layout/Navbar';
import Sidebar from './components/Layout/Sidebar';
import Placeholder from './components/Placeholder';
import ChangePassword from './components/Layout/ChangePassword';

// Auth Pages
import LoginForm from './components/Auth/LoginForm';

// Manager Pages
import ManagerDashboard from './components/Manager/ManagerDashboard';
import SeniorManagerDashboard from './components/Manager/SeniorManagerDashboard';
import CoachingFormWizard from './components/Manager/CoachingForm/CoachingFormWizard';
import PlannerProfile from './components/Manager/PlannerProfile';
import MyPlanners from './components/Manager/MyPlanners';
import TeamManagement from './components/Manager/TeamManagement';
import UsefulLinksPage from './components/Layout/UsefulLinksPage';

// Planner Pages
import PlannerDashboard from './components/Planner/PlannerDashboard';
import PendingConfirmations from './components/Planner/PendingConfirmations';

// Admin Pages
import AdminDashboard from './components/Admin/AdminDashboard';
import LibraryBrowser from './components/Admin/CoachingLibrary/LibraryBrowser';

import './App.css';

function ChangePasswordRoute() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const dashboardPath =
    role === 'senior_manager'
      ? '/senior-manager/dashboard'
      : role === 'manager'
      ? '/manager/dashboard'
      : role === 'planner'
      ? '/planner/dashboard'
      : '/admin/dashboard';
  return <ChangePassword onDone={() => navigate(dashboardPath)} />;
}

function App() {
  const { isAuthenticated, loading, role, user } = useAuth();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Router>
        <Routes>
          <Route path="/login" element={<LoginForm />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    );
  }

  if (user?.password_reset_required) {
    return <ChangePassword forced />;
  }

  // Authenticated routes
  return (
    <Router>
      <Toaster position="top-right" />
      <div className="app-layout">
        <Navbar />
        <div className="main-content">
          <Sidebar role={role} />
          <div className="content-area">
            <Routes>
              {/* Manager Routes */}
              <Route
                path="/manager/dashboard"
                element={
                  <ProtectedRoute requiredRole="manager">
                    <ManagerDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/manager/coaching/start"
                element={
                  <ProtectedRoute requiredRole="manager">
                    <CoachingFormWizard />
                  </ProtectedRoute>
                }
              />
              {/* Senior Manager Routes */}
              <Route
                path="/senior-manager/dashboard"
                element={
                  <ProtectedRoute requiredRole="senior_manager">
                    <SeniorManagerDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/senior-manager/team"
                element={
                  <ProtectedRoute requiredRole="senior_manager">
                    <TeamManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/manager/coaching/:sessionId/edit"
                element={
                  <ProtectedRoute requiredRole="manager">
                    <CoachingFormWizard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/manager/planner/:plannerId"
                element={
                  <ProtectedRoute requiredRole="manager">
                    <PlannerProfile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/manager/planners"
                element={
                  <ProtectedRoute requiredRole="manager">
                    <MyPlanners />
                  </ProtectedRoute>
                }
              />

              {/* Planner Routes */}
              <Route
                path="/planner/dashboard"
                element={
                  <ProtectedRoute requiredRole="planner">
                    <PlannerDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/planner/confirmations"
                element={
                  <ProtectedRoute requiredRole="planner">
                    <PendingConfirmations />
                  </ProtectedRoute>
                }
              />

              {/* Sales Cycle / Income Simulation - placeholders, content to
                  follow. Open to every logged-in role, same as Useful
                  Links. */}
              <Route
                path="/sales-cycle"
                element={
                  <ProtectedRoute>
                    <Placeholder title="Sales Cycle" message="Content to follow." />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/income-simulation"
                element={
                  <ProtectedRoute>
                    <Placeholder title="Income Simulation" message="Content to follow." />
                  </ProtectedRoute>
                }
              />

              {/* Admin Routes */}
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/library"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <LibraryBrowser />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <Placeholder
                      title="User Management"
                      message="Create users, assign roles, and manage the organizational hierarchy (coming soon)"
                      backLink="/admin/dashboard"
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/settings"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <Placeholder
                      title="Settings"
                      message="Configure system settings and preferences (coming soon)"
                      backLink="/admin/dashboard"
                    />
                  </ProtectedRoute>
                }
              />

              {/* Account */}
              <Route path="/account/password" element={<ChangePasswordRoute />} />

              {/* Useful Links - shared across every role */}
              <Route
                path="/links"
                element={
                  <ProtectedRoute>
                    <UsefulLinksPage />
                  </ProtectedRoute>
                }
              />

              {/* Default Routes */}
              <Route
                path="/"
                element={
                  role === 'senior_manager' ? (
                    <Navigate to="/senior-manager/dashboard" replace />
                  ) : role === 'manager' ? (
                    <Navigate to="/manager/dashboard" replace />
                  ) : role === 'planner' ? (
                    <Navigate to="/planner/dashboard" replace />
                  ) : role === 'admin' ? (
                    <Navigate to="/admin/dashboard" replace />
                  ) : (
                    <Navigate to="/login" replace />
                  )
                }
              />

              {/* Catch all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </div>
      </div>
    </Router>
  );
}

export default App;
