/**
 * Utility functions for @wasteday/ingest package
 */

import type { SampleEvent, SessionKeyComponents } from './types';
import { parseSessionKey } from './validators';

/**
 * Build session key from sample event
 */
export function buildSessionKey(sample: SampleEvent): string {
  const category = sample.category;
  const identifier = sample.identifier.toLowerCase();
  const user_state = sample.user_state;
  return `category=${category};identifier=${identifier};user_state=${user_state}`;
}

/**
 * Build session key from components
 */
export function buildSessionKeyFromComponents(components: SessionKeyComponents): string {
  const { category, identifier, user_state } = components;
  return `category=${category};identifier=${identifier.toLowerCase()};user_state=${user_state}`;
}

/**
 * Calculate duration between two timestamps in seconds
 */
export function calculateDurationSeconds(startTime: string, endTime: string): number {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  return Math.max(0, Math.floor((end - start) / 1000));
}

/**
 * Get current timestamp in ISO format
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Check if two timestamps are within the specified gap threshold
 */
export function isWithinGapThreshold(
  timestamp1: string, 
  timestamp2: string, 
  thresholdSeconds: number
): boolean {
  const time1 = new Date(timestamp1).getTime();
  const time2 = new Date(timestamp2).getTime();
  const gapSeconds = Math.floor(Math.abs(time2 - time1) / 1000);
  return gapSeconds <= thresholdSeconds;
}

/**
 * Check if a session should be merged based on grace period and duration
 */
export function shouldMergeSession(
  gapSinceLastSample: number,
  totalDurationSeconds: number,
  gracePeriodSeconds: number,
  samplingIntervalMs: number
): boolean {
  const samplingIntervalSeconds = samplingIntervalMs / 1000;
  return gapSinceLastSample <= gracePeriodSeconds && 
         totalDurationSeconds < samplingIntervalSeconds;
}

/**
 * Extract session key components from sample event
 */
export function extractSessionKeyComponents(sample: SampleEvent): SessionKeyComponents {
  const sessionKey = buildSessionKey(sample);
  return parseSessionKey(sessionKey);
}

/**
 * Normalize identifier (convert to lowercase)
 */
export function normalizeIdentifier(identifier: string): string {
  return identifier.toLowerCase();
}

/**
 * Check if sample represents idle state
 */
export function isIdleSample(sample: SampleEvent): boolean {
  return sample.user_state === 'idle';
}

/**
 * Check if sample represents active state
 */
export function isActiveSample(sample: SampleEvent): boolean {
  return sample.user_state === 'active';
}

/**
 * Merge sample metadata (window_title, url, is_media_playing)
 */
export function mergeSampleMetadata(
  existing: Partial<SampleEvent>,
  incoming: SampleEvent
): Partial<SampleEvent> {
  return {
    window_title: incoming.window_title || existing.window_title,
    url: incoming.url || existing.url,
    is_media_playing: existing.is_media_playing || Boolean(incoming.is_media_playing)
  };
}

/**
 * Create a deep copy of a sample event
 */
export function cloneSampleEvent(sample: SampleEvent): SampleEvent {
  return {
    timestamp: sample.timestamp,
    category: sample.category,
    identifier: sample.identifier,
    window_title: sample.window_title,
    url: sample.url,
    user_state: sample.user_state,
    is_media_playing: sample.is_media_playing
  };
}

/**
 * Format duration for logging
 */
export function formatDuration(durationSeconds: number): string {
  if (durationSeconds < 60) {
    return `${durationSeconds}s`;
  } else if (durationSeconds < 3600) {
    const minutes = Math.floor(durationSeconds / 60);
    const seconds = durationSeconds % 60;
    return `${minutes}m ${seconds}s`;
  } else {
    const hours = Math.floor(durationSeconds / 3600);
    const minutes = Math.floor((durationSeconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
}
