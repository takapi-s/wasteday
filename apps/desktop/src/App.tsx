import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DataPage } from './pages/DataPage';
import { SettingsPage } from './pages/SettingsPage';
import { DashboardPage } from './pages/DashboardPage';
import { AppManagementPage } from './pages/AppManagementPage';
import { IngestProvider } from './context/IngestContext';
import { UpdateNotification } from './components/UpdateNotification';

export const App: React.FC = () => {
  return (
    <Router>
      <IngestProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="data" element={<DataPage />} />
            <Route path="apps" element={<AppManagementPage />} />
          </Route>
        </Routes>
        <UpdateNotification />
      </IngestProvider>
    </Router>
  );
};

