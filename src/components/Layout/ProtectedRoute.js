import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const ProtectedRoute = ({ children, requiredRole }) => {
  const { isAuthenticated, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check if user has required role
  if (requiredRole) {
    const hasRole = role === requiredRole || 
                    (requiredRole === 'manager' && role === 'senior_manager');
    
    if (!hasRole) {
      // Redirect to appropriate dashboard
      if (role === 'manager' || role === 'senior_manager') {
        return <Navigate to="/manager/dashboard" replace />;
      } else if (role === 'planner') {
        return <Navigate to="/planner/dashboard" replace />;
      } else if (role === 'admin') {
        return <Navigate to="/admin/dashboard" replace />;
      }
      return <Navigate to="/" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
