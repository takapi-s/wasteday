import React from 'react';

interface DatabaseStatusProps {
  connected: boolean;
  loading: boolean;
  error: string | null;
  className?: string;
}

export const DatabaseStatus: React.FC<DatabaseStatusProps> = ({
  connected,
  loading,
  error,
  className = '',
}) => {
  const getStatusColor = () => {
    if (error) return 'text-red-600 dark:text-red-400';
    if (loading) return 'text-yellow-600 dark:text-yellow-400';
    if (connected) return 'text-green-600 dark:text-green-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const getStatusText = () => {
    if (error) return 'Connection Error';
    if (loading) return 'Connecting...';
    if (connected) return 'Connected';
    return 'Disconnected';
  };

  const getStatusIcon = () => {
    if (error) {
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      );
    }
    
    if (loading) {
      return (
        <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
      );
    }
    
    if (connected) {
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      );
    }
    
    return (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    );
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {getStatusIcon()}
      <span className={`text-sm font-medium ${getStatusColor()}`}>
        {getStatusText()}
      </span>
      {error && (
        <span className="text-xs text-red-500 dark:text-red-400">
          {error}
        </span>
      )}
    </div>
  );
};
