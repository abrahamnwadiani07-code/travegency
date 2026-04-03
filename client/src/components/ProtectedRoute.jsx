import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="dash-spinner" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // Role check — agent role also allows admin access
  if (role === 'agent' && user.role !== 'agent' && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  if (role === 'admin' && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
