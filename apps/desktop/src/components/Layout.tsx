import React from 'react';
import { Outlet } from 'react-router-dom';
import { Layout as SharedLayout } from '@wasteday/ui';

export const Layout: React.FC = () => {
  return (
    <SharedLayout title="WasteDay Desktop">
      <Outlet />
    </SharedLayout>
  );
};
