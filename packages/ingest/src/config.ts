/**
 * Configuration management for @wasteday/ingest package
 */

import type { IngestOptions } from './types';
import { ConfigurationError } from './errors';

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG = {
  samplingIntervalMs: 5000,
  idleGapThresholdSeconds: 20,
  sessionSwitchGracePeriodSeconds: 10,
} as const;

/**
 * Configuration validation rules
 */
export const CONFIG_VALIDATION = {
  samplingIntervalMs: { min: 1000, max: 60000 }, // 1秒〜1分
  idleGapThresholdSeconds: { min: 5, max: 300 }, // 5秒〜5分
  sessionSwitchGracePeriodSeconds: { min: 1, max: 60 }, // 1秒〜1分
} as const;

/**
 * Validate configuration options
 */
export function validateConfig(options: IngestOptions): IngestOptions {
  const validated = { ...options };

  if (validated.samplingIntervalMs !== undefined) {
    const { min, max } = CONFIG_VALIDATION.samplingIntervalMs;
    if (validated.samplingIntervalMs < min || validated.samplingIntervalMs > max) {
      throw new ConfigurationError(
        `samplingIntervalMs must be between ${min} and ${max} milliseconds`
      );
    }
  }

  if (validated.idleGapThresholdSeconds !== undefined) {
    const { min, max } = CONFIG_VALIDATION.idleGapThresholdSeconds;
    if (validated.idleGapThresholdSeconds < min || validated.idleGapThresholdSeconds > max) {
      throw new ConfigurationError(
        `idleGapThresholdSeconds must be between ${min} and ${max} seconds`
      );
    }
  }

  if (validated.sessionSwitchGracePeriodSeconds !== undefined) {
    const { min, max } = CONFIG_VALIDATION.sessionSwitchGracePeriodSeconds;
    if (validated.sessionSwitchGracePeriodSeconds < min || validated.sessionSwitchGracePeriodSeconds > max) {
      throw new ConfigurationError(
        `sessionSwitchGracePeriodSeconds must be between ${min} and ${max} seconds`
      );
    }
  }

  return validated;
}

/**
 * Merge user options with defaults
 */
export function mergeConfig(options?: IngestOptions): Required<IngestOptions> {
  if (!options) {
    return { ...DEFAULT_CONFIG };
  }

  const validated = validateConfig(options);
  
  return {
    samplingIntervalMs: validated.samplingIntervalMs ?? DEFAULT_CONFIG.samplingIntervalMs,
    idleGapThresholdSeconds: validated.idleGapThresholdSeconds ?? DEFAULT_CONFIG.idleGapThresholdSeconds,
    sessionSwitchGracePeriodSeconds: validated.sessionSwitchGracePeriodSeconds ?? DEFAULT_CONFIG.sessionSwitchGracePeriodSeconds,
  };
}

/**
 * Create configuration from environment variables
 */
export function createConfigFromEnv(): IngestOptions {
  const options: IngestOptions = {};

  if (process.env.INGEST_SAMPLING_INTERVAL_MS) {
    const value = parseInt(process.env.INGEST_SAMPLING_INTERVAL_MS, 10);
    if (!isNaN(value)) {
      options.samplingIntervalMs = value;
    }
  }

  if (process.env.INGEST_IDLE_GAP_THRESHOLD_SECONDS) {
    const value = parseInt(process.env.INGEST_IDLE_GAP_THRESHOLD_SECONDS, 10);
    if (!isNaN(value)) {
      options.idleGapThresholdSeconds = value;
    }
  }

  if (process.env.INGEST_SESSION_SWITCH_GRACE_PERIOD_SECONDS) {
    const value = parseInt(process.env.INGEST_SESSION_SWITCH_GRACE_PERIOD_SECONDS, 10);
    if (!isNaN(value)) {
      options.sessionSwitchGracePeriodSeconds = value;
    }
  }

  return options;
}
