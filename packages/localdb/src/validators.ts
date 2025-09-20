/**
 * Validation utilities for LocalDB entities
 */

import { ValidationError } from './errors';
import type { Session, WasteCategory, UserSettings } from './types';

export const validateSession = (session: Partial<Session>): Session => {
  if (!session.id || typeof session.id !== 'string' || session.id.trim() === '') {
    throw new ValidationError('Session id is required and must be a non-empty string', 'id');
  }

  if (!session.start_time || typeof session.start_time !== 'string') {
    throw new ValidationError('Session start_time is required and must be a string', 'start_time');
  }

  // Validate ISO timestamp format
  const date = new Date(session.start_time);
  if (isNaN(date.getTime())) {
    throw new ValidationError('Session start_time must be a valid ISO timestamp', 'start_time');
  }

  if (typeof session.duration_seconds !== 'number' || session.duration_seconds < 0) {
    throw new ValidationError('Session duration_seconds must be a non-negative number', 'duration_seconds');
  }

  if (!session.session_key || typeof session.session_key !== 'string' || session.session_key.trim() === '') {
    throw new ValidationError('Session session_key is required and must be a non-empty string', 'session_key');
  }

  return session as Session;
};

export const validateWasteCategory = (category: Partial<WasteCategory>): WasteCategory => {
  if (!category.type || typeof category.type !== 'string' || category.type.trim() === '') {
    throw new ValidationError('Category type is required and must be a non-empty string', 'type');
  }

  if (!category.identifier || typeof category.identifier !== 'string' || category.identifier.trim() === '') {
    throw new ValidationError('Category identifier is required and must be a non-empty string', 'identifier');
  }

  if (!category.label || !['waste', 'productive'].includes(category.label)) {
    throw new ValidationError('Category label must be either "waste" or "productive"', 'label');
  }

  if (typeof category.is_active !== 'boolean') {
    throw new ValidationError('Category is_active must be a boolean', 'is_active');
  }

  return category as WasteCategory;
};

export const validateUserSettings = (settings: Partial<UserSettings>): UserSettings => {
  if (settings.goalDailyWasteSeconds !== undefined) {
    if (typeof settings.goalDailyWasteSeconds !== 'number' || settings.goalDailyWasteSeconds < 0) {
      throw new ValidationError('goalDailyWasteSeconds must be a non-negative number', 'goalDailyWasteSeconds');
    }
  }

  return settings as UserSettings;
};

export const validateSessionKey = (sessionKey: string): Record<string, string> => {
  if (!sessionKey || typeof sessionKey !== 'string') {
    throw new ValidationError('Session key must be a non-empty string');
  }

  const parts = sessionKey.split(';');
  const result: Record<string, string> = {};

  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key && value) {
      result[key.trim()] = value.trim();
    }
  }

  // Validate required keys
  if (!result.category) {
    throw new ValidationError('Session key must contain "category" field');
  }
  if (!result.identifier) {
    throw new ValidationError('Session key must contain "identifier" field');
  }

  return result;
};
