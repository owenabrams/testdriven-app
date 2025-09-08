import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout/Layout';
import LoginPage from './pages/Auth/LoginPage';
import Dashboard from './pages/Dashboard/Dashboard';
import GroupsPage from './pages/Groups/GroupsPage';
import GroupDetailsPage from './pages/Groups/GroupDetailsPage';
import CampaignsPage from './pages/Campaigns/CampaignsPage';
import CampaignDetailsPage from './pages/Campaigns/CampaignDetailsPage';
import LoansPage from './pages/Loans/LoansPage';
import LoanAssessmentPage from './pages/Loans/LoanAssessmentPage';
import AnalyticsPage from './pages/Analytics/AnalyticsPage';
import ProfilePage from './pages/Profile/ProfilePage';
import AdminDashboard from './pages/Admin/AdminDashboard';
import SavingsGroupsApp from './pages/SavingsGroups/SavingsGroupsApp';
import LoadingSpinner from './components/Common/LoadingSpinner';

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
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/groups" element={<GroupsPage />} />
        <Route path="/groups/:id" element={<GroupDetailsPage />} />
        <Route path="/campaigns" element={<CampaignsPage />} />
        <Route path="/campaigns/:id" element={<CampaignDetailsPage />} />
        <Route path="/loans" element={<LoansPage />} />
        <Route path="/loans/assessment/:memberId" element={<LoanAssessmentPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/savings-groups/*" element={<SavingsGroupsApp />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  );
}

export default App;