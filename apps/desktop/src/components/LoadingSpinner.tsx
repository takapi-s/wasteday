import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  text,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="flex items-center space-x-2">
        <div className={`${sizeClasses[size]} border-2 border-blue-500 border-t-transparent rounded-full animate-spin`}></div>
        {text && (
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {text}
          </span>
        )}
      </div>
    </div>
  );
};
