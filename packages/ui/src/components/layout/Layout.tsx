import React from 'react';
import { Outlet, useLocation, Link } from 'react-router';

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
  const [isCollapsed, setIsCollapsed] = React.useState<boolean>(() => {
    try {
      const raw = localStorage.getItem('wasteday-ui-sidebar-collapsed');
      return raw === '1';
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('wasteday-ui-sidebar-collapsed', next ? '1' : '0');
      } catch {}
      return next;
    });
  };

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-neutral-950 ${className}`}>
      <div className="flex gap-6 items-start p-6 min-h-[calc(100vh-3rem)]">
        {/* Sidebar */}
        <aside className={`${isCollapsed ? 'w-16 pr-2' : 'w-56 pr-4'} h-full flex-shrink-0 flex flex-col gap-2 transition-all duration-200 border-white/20 dark:border-white/10 border-r bg-white/60 dark:bg-neutral-900/50 backdrop-blur-md rounded-lg overflow-hidden`}>
          <div className={`flex items-center mb-1 px-3 ${isCollapsed ? 'justify-center' : ''}`}>
            <h2 className={`text-lg font-semibold text-gray-800 dark:text-neutral-100 ${isCollapsed ? 'w-full text-center' : 'truncate'}`}>
              {isCollapsed ? (title ? title.slice(0, 1) : '') : title}
            </h2>
          </div>
          <nav className={`flex flex-col gap-2 ${isCollapsed ? 'items-center' : ''}`}>
            <Link
              to="/dashboard"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 overflow-hidden ${
                location.pathname.startsWith('/dashboard')
                  ? 'bg-gray-100 text-gray-800 dark:bg-white/10 dark:text-neutral-100'
                  : 'text-gray-600 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-neutral-100'
              }`}
            >
              <span className="material-symbols-outlined text-[20px] leading-none">space_dashboard</span>
              <span className={`${isCollapsed ? 'hidden' : 'inline'} whitespace-nowrap truncate`}>Dashboard</span>
            </Link>
            <Link
              to="/activity"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 overflow-hidden ${
                location.pathname.startsWith('/activity')
                  ? 'bg-gray-100 text-gray-800 dark:bg-white/10 dark:text-neutral-100'
                  : 'text-gray-600 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-neutral-100'
              }`}
            >
              <span className="material-symbols-outlined text-[20px] leading-none">timeline</span>
              <span className={`${isCollapsed ? 'hidden' : 'inline'} whitespace-nowrap truncate`}>Activity</span>
            </Link>
            <Link
              to="/data"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 overflow-hidden ${
                location.pathname.startsWith('/data')
                  ? 'bg-gray-100 text-gray-800 dark:bg-white/10 dark:text-neutral-100'
                  : 'text-gray-600 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-neutral-100'
              }`}
            >
              <span className="material-symbols-outlined text-[20px] leading-none">dataset</span>
              <span className={`${isCollapsed ? 'hidden' : 'inline'} whitespace-nowrap truncate`}>Data</span>
            </Link>
            <Link
              to="/apps"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 overflow-hidden ${
                location.pathname.startsWith('/apps')
                  ? 'bg-gray-100 text-gray-800 dark:bg-white/10 dark:text-neutral-100'
                  : 'text-gray-600 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-neutral-100'
              }`}
            >
              <span className="material-symbols-outlined text-[20px] leading-none">apps</span>
              <span className={`${isCollapsed ? 'hidden' : 'inline'} whitespace-nowrap truncate`}>App Management</span>
            </Link>
            <Link
              to="/settings"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 overflow-hidden ${
                location.pathname === '/settings'
                  ? 'bg-gray-100 text-gray-800 dark:bg-white/10 dark:text-neutral-100'
                  : 'text-gray-600 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-neutral-100'
              }`}
            >
              <span className="material-symbols-outlined text-[20px] leading-none">settings</span>
              <span className={`${isCollapsed ? 'hidden' : 'inline'} whitespace-nowrap truncate`}>Settings</span>
            </Link>
          </nav>
          {/* Bottom toggle button */}
          <div className="mt-auto px-3 pb-3">
            <button
              onClick={toggleCollapsed}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="w-full flex items-center justify-center gap-2 px-2 py-2 rounded-md text-gray-700 dark:text-neutral-200 hover:bg-gray-100 dark:hover:bg-white/10"
            >
              <span className="material-symbols-outlined text-[18px] leading-none">{isCollapsed ? 'chevron_right' : 'chevron_left'}</span>
              <span className={`${isCollapsed ? 'hidden' : 'inline'}`}>Collapse</span>
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
};