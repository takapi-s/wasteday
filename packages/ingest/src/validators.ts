/**
 * Validation utilities for @wasteday/ingest package
 */

import type { SampleEvent, SessionizedEvent, SessionKeyComponents } from './types';
import { ValidationError } from './errors';

/**
 * Validate sample event data
 */
export function validateSampleEvent(sample: any): SampleEvent {
  if (!sample || typeof sample !== 'object') {
    throw new ValidationError('Sample event must be an object');
  }

  if (!sample.timestamp || typeof sample.timestamp !== 'string') {
    throw new ValidationError('Sample timestamp is required and must be a string', 'timestamp');
  }

  // Validate ISO timestamp format
  const date = new Date(sample.timestamp);
  if (isNaN(date.getTime())) {
    throw new ValidationError('Sample timestamp must be a valid ISO timestamp', 'timestamp');
  }

  if (!sample.category || !['app', 'browser', 'system'].includes(sample.category)) {
    throw new ValidationError('Sample category must be "app", "browser", or "system"', 'category');
  }

  if (!sample.identifier || typeof sample.identifier !== 'string' || sample.identifier.trim() === '') {
    throw new ValidationError('Sample identifier is required and must be a non-empty string', 'identifier');
  }

  if (!sample.user_state || !['active', 'idle'].includes(sample.user_state)) {
    throw new ValidationError('Sample user_state must be "active" or "idle"', 'user_state');
  }

  if (sample.window_title !== undefined && typeof sample.window_title !== 'string') {
    throw new ValidationError('Sample window_title must be a string if provided', 'window_title');
  }

  if (sample.url !== undefined && typeof sample.url !== 'string') {
    throw new ValidationError('Sample url must be a string if provided', 'url');
  }

  if (sample.is_media_playing !== undefined && typeof sample.is_media_playing !== 'boolean') {
    throw new ValidationError('Sample is_media_playing must be a boolean if provided', 'is_media_playing');
  }

  return sample as SampleEvent;
}

/**
 * Validate sessionized event data
 */
export function validateSessionizedEvent(event: any): SessionizedEvent {
  if (!event || typeof event !== 'object') {
    throw new ValidationError('Sessionized event must be an object');
  }

  if (!event.type || !['session_started', 'session_updated', 'session_ended'].includes(event.type)) {
    throw new ValidationError('Event type must be "session_started", "session_updated", or "session_ended"', 'type');
  }

  if (!event.session_key || typeof event.session_key !== 'string' || event.session_key.trim() === '') {
    throw new ValidationError('Event session_key is required and must be a non-empty string', 'session_key');
  }

  if (!event.start_time || typeof event.start_time !== 'string') {
    throw new ValidationError('Event start_time is required and must be a string', 'start_time');
  }

  // Validate ISO timestamp format
  const startDate = new Date(event.start_time);
  if (isNaN(startDate.getTime())) {
    throw new ValidationError('Event start_time must be a valid ISO timestamp', 'start_time');
  }

  if (!event.end_time || typeof event.end_time !== 'string') {
    throw new ValidationError('Event end_time is required and must be a string', 'end_time');
  }

  // Validate ISO timestamp format
  const endDate = new Date(event.end_time);
  if (isNaN(endDate.getTime())) {
    throw new ValidationError('Event end_time must be a valid ISO timestamp', 'end_time');
  }

  if (typeof event.duration_seconds !== 'number' || event.duration_seconds < 0) {
    throw new ValidationError('Event duration_seconds must be a non-negative number', 'duration_seconds');
  }

  if (typeof event.is_idle !== 'boolean') {
    throw new ValidationError('Event is_idle must be a boolean', 'is_idle');
  }

  if (typeof event.is_media_playing !== 'boolean') {
    throw new ValidationError('Event is_media_playing must be a boolean', 'is_media_playing');
  }

  if (event.window_title !== undefined && typeof event.window_title !== 'string') {
    throw new ValidationError('Event window_title must be a string if provided', 'window_title');
  }

  if (event.url !== undefined && typeof event.url !== 'string') {
    throw new ValidationError('Event url must be a string if provided', 'url');
  }

  return event as SessionizedEvent;
}

/**
 * Parse and validate session key
 */
export function parseSessionKey(sessionKey: string): SessionKeyComponents {
  if (!sessionKey || typeof sessionKey !== 'string') {
    throw new ValidationError('Session key must be a non-empty string');
  }

  const parts = sessionKey.split(';');
  const components: Record<string, string> = {};

  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key && value) {
      components[key.trim()] = value.trim();
    }
  }

  if (!components.category || !['app', 'browser', 'system'].includes(components.category)) {
    throw new ValidationError('Session key must contain valid category (app, browser, or system)');
  }

  if (!components.identifier || components.identifier.trim() === '') {
    throw new ValidationError('Session key must contain non-empty identifier');
  }

  if (!components.user_state || !['active', 'idle'].includes(components.user_state)) {
    throw new ValidationError('Session key must contain valid user_state (active or idle)');
  }

  return {
    category: components.category as 'app' | 'browser' | 'system',
    identifier: components.identifier,
    user_state: components.user_state as 'active' | 'idle'
  };
}

/**
 * Validate session key format
 */
export function isValidSessionKey(sessionKey: string): boolean {
  try {
    parseSessionKey(sessionKey);
    return true;
  } catch {
    return false;
  }
}
