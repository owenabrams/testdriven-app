import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import Layout from './components/Layout/Layout';
import LoginPage from './pages/Auth/LoginPage';
import Dashboard from './pages/Dashboard/Dashboard';
import LoadingSpinner from './components/Common/LoadingSpinner';

// Lazy load heavy components for better mobile performance
const GroupsPage = lazy(() => import('./pages/Groups/GroupsPage'));
const GroupDetailsPage = lazy(() => import('./pages/Groups/GroupDetailsPage'));
const CampaignsPage = lazy(() => import('./pages/Campaigns/CampaignsPage'));
const CampaignDetailsPage = lazy(() => import('./pages/Campaigns/CampaignDetailsPage'));
const LoansPage = lazy(() => import('./pages/Loans/LoansPage'));
const LoanAssessmentPage = lazy(() => import('./pages/Loans/LoanAssessmentPage'));
const AnalyticsPage = lazy(() => import('./pages/Analytics/AnalyticsPage'));
const CalendarPage = lazy(() => import('./pages/Calendar/CalendarPage'));
const ProfilePage = lazy(() => import('./pages/Profile/ProfilePage'));
const AdminDashboard = lazy(() => import('./pages/Admin/AdminDashboard'));
const NotificationsPage = lazy(() => import('./pages/Notifications/NotificationsPage'));
const MemberProfilePage = lazy(() => import('./pages/Members/MemberProfilePage'));
const MeetingDetailsPage = lazy(() => import('./pages/Meetings/MeetingDetailsPage'));
const CurrencySettings = lazy(() => import('./pages/Settings/CurrencySettings'));

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <Layout>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/groups" element={<GroupsPage />} />
          <Route path="/groups/:id" element={<GroupDetailsPage />} />
          <Route path="/members" element={<Navigate to="/groups" replace />} />
          <Route path="/members/:memberId" element={<MemberProfilePage />} />
          <Route path="/meetings" element={<Navigate to="/calendar" replace />} />
          <Route path="/meetings/:meetingId" element={<MeetingDetailsPage />} />
          <Route path="/activities" element={<Navigate to="/groups" replace />} />
          <Route path="/campaigns" element={<CampaignsPage />} />
          <Route path="/campaigns/:id" element={<CampaignDetailsPage />} />
          <Route path="/loans" element={<LoansPage />} />
          <Route path="/loans/assessment/:memberId" element={<LoanAssessmentPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/export" element={<Navigate to="/analytics" replace />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings/currency" element={<CurrencySettings />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}

export default App;