import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

export const useDarkMode = () => {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('wasteday-theme');
    return (saved as Theme) || 'system';
  });

  const [isDark, setIsDark] = useState(() => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return theme === 'dark';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDark]);

  useEffect(() => {
    localStorage.setItem('wasteday-theme', theme);
    
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        setIsDark(e.matches);
      };
      
      setIsDark(mediaQuery.matches);
      mediaQuery.addEventListener('change', handleChange);
      
      return () => {
        mediaQuery.removeEventListener('change', handleChange);
      };
    } else {
      setIsDark(theme === 'dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => {
      switch (prev) {
        case 'light':
          return 'dark';
        case 'dark':
          return 'system';
        case 'system':
          return 'light';
        default:
          return 'light';
      }
    });
  };

  const setLightMode = () => setTheme('light');
  const setDarkMode = () => setTheme('dark');
  const setSystemMode = () => setTheme('system');

  return {
    theme,
    isDark,
    toggleTheme,
    setLightMode,
    setDarkMode,
    setSystemMode,
  };
};
