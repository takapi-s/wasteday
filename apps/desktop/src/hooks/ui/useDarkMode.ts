import { useEffect } from 'react';

type Theme = 'dark';

export const useDarkMode = () => {
  // Force dark mode on mount
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.add('dark');
  }, []);

  const theme: Theme = 'dark';
  const isDark = true;

  return {
    theme,
    isDark,
    // no-op functions kept for API compatibility
    toggleTheme: () => {},
    setLightMode: () => {},
    setDarkMode: () => {},
    setSystemMode: () => {},
  };
};
