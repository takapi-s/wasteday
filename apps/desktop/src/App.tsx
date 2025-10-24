import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { Layout } from './components/Layout';
import { DataPage } from './pages/DataPage';
import { SettingsPage } from './pages/SettingsPage';
import { DashboardPage } from './pages/DashboardPage';
import { UnifiedDashboardPage } from './pages/UnifiedDashboardPage';
import { AppManagementPage } from './pages/AppManagementPage';
import { ActivityPage } from './pages/ActivityPage';
import { IngestProvider } from './context/IngestContext';
import { UpdateNotification } from './components/UpdateNotification';

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <IngestProvider>
        <Layout />
        <UpdateNotification />
      </IngestProvider>
    ),
    children: [
      {
        index: true,
        element: <ActivityPage />
      },
      {
        path: "dashboard",
        element: <UnifiedDashboardPage />
      },
      {
        path: "dashboard/desktop",
        element: <DashboardPage />
      },
      {
        path: "activity",
        element: <ActivityPage />
      },
      {
        path: "settings",
        element: <SettingsPage />
      },
      {
        path: "data",
        element: <DataPage />
      },
      {
        path: "apps",
        element: <AppManagementPage />
      }
    ]
  }
]);

export const App: React.FC = () => {
  return <RouterProvider router={router} />;
};

