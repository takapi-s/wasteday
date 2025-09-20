/**
 * Utility functions for LocalDB operations
 */

import type { Session, WasteCategory, SessionKeyComponents } from './types';

/**
 * Check if a session is classified as waste based on categories
 */
export const isWasteSession = (session: Session, categories: WasteCategory[]): boolean => {
  const components = parseSessionKey(session.session_key);
  return categories.some(cat => 
    cat.is_active && 
    cat.type === components.category && 
    cat.identifier === components.identifier && 
    cat.label === 'waste'
  );
};

/**
 * Check if a session is classified as productive based on categories
 */
export const isProductiveSession = (session: Session, categories: WasteCategory[]): boolean => {
  const components = parseSessionKey(session.session_key);
  return categories.some(cat => 
    cat.is_active && 
    cat.type === components.category && 
    cat.identifier === components.identifier && 
    cat.label === 'productive'
  );
};

/**
 * Parse session key string into components
 */
export const parseSessionKey = (sessionKey: string): SessionKeyComponents => {
  const parts = sessionKey.split(';');
  const result: Record<string, string> = {};

  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key && value) {
      result[key.trim()] = value.trim();
    }
  }

  return {
    category: (result.category as 'app' | 'browser' | 'system') || 'app',
    identifier: result.identifier || '',
    user_state: (result.user_state as 'active' | 'idle') || 'active',
    window_title: result.window_title,
    url: result.url
  };
};

/**
 * Build session key string from components
 */
export const buildSessionKey = (components: SessionKeyComponents): string => {
  const parts: string[] = [
    `category=${components.category}`,
    `identifier=${components.identifier}`,
    `user_state=${components.user_state}`
  ];

  if (components.window_title) {
    parts.push(`window_title=${components.window_title}`);
  }
  if (components.url) {
    parts.push(`url=${components.url}`);
  }

  return parts.join(';');
};

/**
 * Filter sessions by time range
 */
export const filterSessionsByTimeRange = (
  sessions: Session[], 
  since?: string, 
  until?: string
): Session[] => {
  return sessions.filter(session => {
    const sessionTime = new Date(session.start_time);
    
    if (since) {
      const sinceTime = new Date(since);
      if (sessionTime < sinceTime) return false;
    }
    
    if (until) {
      const untilTime = new Date(until);
      if (sessionTime > untilTime) return false;
    }
    
    return true;
  });
};

/**
 * Get unique identifiers from sessions
 */
export const getUniqueIdentifiers = (sessions: Session[]): string[] => {
  const identifiers = new Set<string>();
  
  sessions.forEach(session => {
    const components = parseSessionKey(session.session_key);
    identifiers.add(components.identifier);
  });
  
  return Array.from(identifiers);
};

/**
 * Get unique categories from sessions
 */
export const getUniqueCategories = (sessions: Session[]): string[] => {
  const categories = new Set<string>();
  
  sessions.forEach(session => {
    const components = parseSessionKey(session.session_key);
    categories.add(components.category);
  });
  
  return Array.from(categories);
};

/**
 * Calculate total duration for sessions
 */
export const calculateTotalDuration = (sessions: Session[]): number => {
  return sessions.reduce((total, session) => total + session.duration_seconds, 0);
};

/**
 * Group sessions by identifier
 */
export const groupSessionsByIdentifier = (sessions: Session[]): Record<string, Session[]> => {
  const groups: Record<string, Session[]> = {};
  
  sessions.forEach(session => {
    const components = parseSessionKey(session.session_key);
    const identifier = components.identifier;
    
    if (!groups[identifier]) {
      groups[identifier] = [];
    }
    groups[identifier].push(session);
  });
  
  return groups;
};

/**
 * Get top identifiers by duration
 */
export const getTopIdentifiersByDuration = (
  sessions: Session[], 
  limit: number = 10
): Array<{ identifier: string; totalDuration: number }> => {
  const groups = groupSessionsByIdentifier(sessions);
  
  return Object.entries(groups)
    .map(([identifier, sessions]) => ({
      identifier,
      totalDuration: calculateTotalDuration(sessions)
    }))
    .sort((a, b) => b.totalDuration - a.totalDuration)
    .slice(0, limit);
};
