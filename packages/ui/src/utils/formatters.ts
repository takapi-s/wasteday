/**
 * Utility functions for formatting data
 */

/**
 * Format duration in seconds to human-readable format
 * @param totalSeconds - Duration in seconds
 * @returns Formatted string like "2h 30m" or empty string if 0
 */
export const formatDuration = (totalSeconds: number): string => {
  if (totalSeconds === 0) {
    return '';
  }
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  return `${h}h ${m}m`;
};

/**
 * Format percentage with proper sign
 * @param value - Percentage value
 * @returns Formatted string with + or - sign
 */
export const formatPercentage = (value: number): string => {
  return value >= 0 ? `+${value}%` : `${value}%`;
};

/**
 * Format date for display
 * @param date - Date string or Date object
 * @returns Formatted date string
 */
export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString();
};

/**
 * Format time for display
 * @param date - Date string or Date object
 * @returns Formatted time string
 */
export const formatTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString();
};
