import React from 'react';

interface ErrorMessageProps {
  error: string | null;
  title?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  error,
  title = 'Error',
  onRetry,
  className = '',
}) => {
  if (!error) return null;

  return (
    <div className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 ${className}`}>
      <div className="flex items-start">
        <svg className="w-5 h-5 text-red-400 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
            {title}
          </h3>
          <p className="text-sm text-red-700 dark:text-red-300 mt-1">
            {error}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 text-sm text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300 underline"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
