import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';

export interface LayoutProps {
  title?: string;
  className?: string;
  children?: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ 
  title = "Menu", 
  className = "",
  children,
}) => {
  const location = useLocation();

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${className}`}>
      <div className="flex gap-6 items-start p-6">
        {/* Sidebar */}
        <aside className="w-56 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 pr-4 flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">{title}</h2>
          <nav className="flex flex-col gap-2">
            <Link
              to="/dashboard"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                location.pathname.startsWith('/dashboard')
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              Dashboard
            </Link>
            <Link
              to="/data"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                location.pathname.startsWith('/data')
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              Data
            </Link>
            <Link
              to="/apps"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                location.pathname.startsWith('/apps')
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              App Management
            </Link>
            <Link
              to="/settings"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                location.pathname === '/settings'
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              Settings
            </Link>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
};

