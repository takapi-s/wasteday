/**
 * Main IngestService class for processing sample events
 */

import type { 
  SampleEvent, 
  SessionizedEvent, 
  IngestOptions,
  SessionEventListener,
  UnsubscribeFunction,
  SessionWriter,
  IngestStats
} from './types';
import { ValidationError, SessionError } from './errors';
import { validateSampleEvent } from './validators';
import { mergeConfig } from './config';
import { SessionManager } from './session-manager';

/**
 * Main service for processing sample events and managing sessions
 */
export class IngestService {
  private sessionManager: SessionManager;
  private listeners: SessionEventListener[] = [];
  private writers: SessionWriter[] = [];

  constructor(options?: IngestOptions) {
    const config = mergeConfig(options);
    this.sessionManager = new SessionManager(config);
  }

  /**
   * Add an event listener
   */
  onEvent(listener: SessionEventListener): UnsubscribeFunction {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Add a session writer
   */
  addWriter(writer: SessionWriter): void {
    this.writers.push(writer);
  }

  /**
   * Remove a session writer
   */
  removeWriter(writer: SessionWriter): void {
    this.writers = this.writers.filter(w => w !== writer);
  }

  /**
   * Process a sample event
   */
  async handleSample(sample: SampleEvent): Promise<void> {
    try {
      // Validate sample
      const validatedSample = validateSampleEvent(sample);
      
      // Process sample through session manager
      const events = this.sessionManager.processSample(validatedSample);
      
      // Emit events to listeners and writers
      for (const event of events) {
        await this.emitEvent(event);
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        throw new SessionError(`Invalid sample data: ${error.message}`, error.field);
      }
      throw error;
    }
  }

  /**
   * Flush all open sessions
   */
  async flushAll(): Promise<void> {
    const events = this.sessionManager.flushAllSessions();
    
    for (const event of events) {
      await this.emitEvent(event);
    }
  }

  /**
   * Get pending samples from open sessions
   */
  getPendingSamples(): Map<string, SampleEvent> {
    return this.sessionManager.getPendingSamples();
  }

  /**
   * Get service statistics
   */
  getStats(): IngestStats {
    return this.sessionManager.getStats();
  }

  /**
   * Get open sessions count
   */
  getOpenSessionsCount(): number {
    return this.sessionManager.getOpenSessions().size;
  }

  /**
   * Check if service has open sessions
   */
  hasOpenSessions(): boolean {
    return this.getOpenSessionsCount() > 0;
  }

  /**
   * Emit event to all listeners and writers
   */
  private async emitEvent(event: SessionizedEvent): Promise<void> {
    // Emit to listeners
    const listenerPromises = this.listeners.map(async (listener) => {
      try {
        await listener(event);
      } catch (error) {
        console.error('[IngestService] Listener error:', error);
      }
    });

    // Emit to writers
    const writerPromises = this.writers.map(async (writer) => {
      try {
        await writer.write(event);
      } catch (error) {
        console.error('[IngestService] Writer error:', error);
      }
    });

    // Wait for all listeners and writers to complete
    await Promise.allSettled([...listenerPromises, ...writerPromises]);
  }

  /**
   * Get current configuration (read-only)
   */
  getConfig(): Required<IngestOptions> {
    return {
      samplingIntervalMs: (this.sessionManager as any).options.samplingIntervalMs,
      idleGapThresholdSeconds: (this.sessionManager as any).options.idleGapThresholdSeconds,
      sessionSwitchGracePeriodSeconds: (this.sessionManager as any).options.sessionSwitchGracePeriodSeconds,
    };
  }

  /**
   * Create a new instance with the same configuration
   */
  clone(): IngestService {
    const config = this.getConfig();
    return new IngestService(config);
  }

  /**
   * Reset service state (clear all sessions and listeners)
   */
  reset(): void {
    this.listeners = [];
    this.writers = [];
    this.sessionManager = new SessionManager(this.getConfig());
  }
}
