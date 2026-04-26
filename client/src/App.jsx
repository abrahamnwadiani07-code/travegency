import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';

import Navbar             from './components/Navbar';
import ProtectedRoute     from './components/ProtectedRoute';

import Home               from './pages/Home';
import Onboarding         from './pages/Onboarding';
import Portal             from './pages/Portal';
import AgentsPage         from './pages/Agents';
import SwipeMatch         from './pages/SwipeMatch';
import Jobs               from './pages/Jobs';
import Upgrade            from './pages/Upgrade';
import JobsPortal         from './pages/JobsPortal';
import News               from './pages/News';
import PathwayTracker     from './pages/PathwayTracker';
import DocChecker         from './pages/DocChecker';
import VisaPredictor      from './pages/VisaPredictor';
import ScholarshipFinder  from './pages/ScholarshipFinder';
import CostOfLiving       from './pages/CostOfLiving';

import Login              from './pages/auth/Login';
import Register           from './pages/auth/Register';
import ForgotPassword     from './pages/auth/ForgotPassword';
import ResetPassword      from './pages/auth/ResetPassword';
import VerifyEmail        from './pages/auth/VerifyEmail';

import AgentApply         from './pages/agent/AgentApply';
import KYCForm            from './pages/agent/KYCForm';

import TravellerDashboard from './pages/dashboard/TravellerDashboard';
import AgentDashboard     from './pages/dashboard/AgentDashboard';
import AdminDashboard     from './pages/dashboard/AdminDashboard';

import './index.css';

function AppRoutes() {
  const loc = useLocation();
  const isHome = loc.pathname === '/';
  return (
    <div className={isHome ? 'app-content--home' : 'app-content'}>
      <Routes>
          {/* Public */}
          <Route path="/"                   element={<Home />} />
          <Route path="/start"              element={<Onboarding />} />
          <Route path="/portal/:pathId"     element={<Portal />} />
          <Route path="/agents"             element={<AgentsPage />} />

          {/* Agent Matching (standalone fallback) */}
          <Route path="/match"              element={<SwipeMatch />} />

          {/* Jobs & News */}
          <Route path="/jobs"               element={<JobsPortal />} />
          <Route path="/jobs/board"         element={<Jobs />} />
          <Route path="/news"               element={<News />} />
          <Route path="/upgrade"            element={<Upgrade />} />

          {/* Tools */}
          <Route path="/pathway"            element={<ProtectedRoute><PathwayTracker /></ProtectedRoute>} />
          <Route path="/doc-checker"        element={<DocChecker />} />
          <Route path="/visa-predictor"     element={<VisaPredictor />} />
          <Route path="/scholarships"       element={<ScholarshipFinder />} />
          <Route path="/cost-of-living"     element={<CostOfLiving />} />

          {/* Auth */}
          <Route path="/login"              element={<Login />} />
          <Route path="/register"           element={<Register />} />
          <Route path="/forgot-password"    element={<ForgotPassword />} />
          <Route path="/reset-password"     element={<ResetPassword />} />
          <Route path="/verify-email"       element={<VerifyEmail />} />

          {/* Agent Application */}
          <Route path="/agent/apply"        element={<AgentApply />} />
          <Route path="/agent/kyc"          element={<KYCForm />} />

          {/* Traveller Dashboard */}
          <Route path="/dashboard" element={
            <ProtectedRoute><TravellerDashboard /></ProtectedRoute>
          } />

          {/* Agent Portal */}
          <Route path="/agent" element={
            <ProtectedRoute role="agent"><AgentDashboard /></ProtectedRoute>
          } />

          {/* Admin Portal */}
          <Route path="/admin" element={
            <ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
      <AuthProvider>
        <Navbar />
        <AppRoutes />
      </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}
