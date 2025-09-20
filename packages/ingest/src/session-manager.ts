/**
 * Session management logic for @wasteday/ingest package
 */

import type { 
  SampleEvent, 
  SessionizedEvent, 
  OpenSession, 
  SessionKeyComponents,
  IngestStats 
} from './types';
import { SessionError } from './errors';
import { 
  buildSessionKey, 
  calculateDurationSeconds, 
  isWithinGapThreshold,
  shouldMergeSession,
  mergeSampleMetadata,
  cloneSampleEvent
} from './utils';

/**
 * Manages open sessions and handles session lifecycle
 */
export class SessionManager {
  private openSessions = new Map<string, OpenSession>();
  private stats: IngestStats = {
    totalSamplesProcessed: 0,
    totalSessionsStarted: 0,
    totalSessionsEnded: 0,
    openSessionsCount: 0,
  };

  constructor(
    private options: {
      idleGapThresholdSeconds: number;
      sessionSwitchGracePeriodSeconds: number;
      samplingIntervalMs: number;
    }
  ) {}

  /**
   * Get current statistics
   */
  getStats(): IngestStats {
    return {
      ...this.stats,
      openSessionsCount: this.openSessions.size,
    };
  }

  /**
   * Get all open sessions
   */
  getOpenSessions(): Map<string, OpenSession> {
    return new Map(this.openSessions);
  }

  /**
   * Process a sample event and return session events
   */
  processSample(sample: SampleEvent): SessionizedEvent[] {
    this.stats.totalSamplesProcessed++;
    this.stats.lastProcessedSampleTime = sample.timestamp;

    const events: SessionizedEvent[] = [];
    const sessionKey = buildSessionKey(sample);
    const isIdle = sample.user_state === 'idle';

    // End other sessions that are different from current key
    const endedEvents = this.endOtherSessions(sessionKey, sample.timestamp);
    events.push(...endedEvents);

    // Handle current session
    const currentEvent = this.handleCurrentSession(sessionKey, sample, isIdle);
    if (currentEvent) {
      events.push(currentEvent);
    }

    return events;
  }

  /**
   * End all open sessions
   */
  flushAllSessions(): SessionizedEvent[] {
    const events: SessionizedEvent[] = [];
    
    for (const [sessionKey, session] of this.openSessions.entries()) {
      const endEvent = this.createSessionEndEvent(session, session.last_time);
      events.push(endEvent);
      this.openSessions.delete(sessionKey);
    }

    this.stats.totalSessionsEnded += events.length;
    return events;
  }

  /**
   * Get pending samples from open sessions
   */
  getPendingSamples(): Map<string, SampleEvent> {
    const pending = new Map<string, SampleEvent>();
    
    for (const [sessionKey, session] of this.openSessions.entries()) {
      if (session.last_sample) {
        pending.set(sessionKey, cloneSampleEvent(session.last_sample));
      }
    }
    
    return pending;
  }

  /**
   * End sessions that are different from the current session key
   */
  private endOtherSessions(currentSessionKey: string, currentTime: string): SessionizedEvent[] {
    const events: SessionizedEvent[] = [];
    const sessionsToEnd: string[] = [];

    for (const [sessionKey, session] of this.openSessions.entries()) {
      if (sessionKey === currentSessionKey) continue;

      const lastSampleTime = new Date(session.last_time).getTime();
      const currentTimeMs = new Date(currentTime).getTime();
      const gapSinceLastSample = Math.floor((currentTimeMs - lastSampleTime) / 1000);
      
      const totalDurationSeconds = calculateDurationSeconds(session.start_time, currentTime);
      
      const shouldMerge = shouldMergeSession(
        gapSinceLastSample,
        totalDurationSeconds,
        this.options.sessionSwitchGracePeriodSeconds,
        this.options.samplingIntervalMs
      );

      if (!shouldMerge) {
        const endEvent = this.createSessionEndEvent(session, currentTime);
        events.push(endEvent);
        sessionsToEnd.push(sessionKey);
      }
    }

    // Remove ended sessions
    sessionsToEnd.forEach(key => this.openSessions.delete(key));
    this.stats.totalSessionsEnded += events.length;

    return events;
  }

  /**
   * Handle the current session (start new or update existing)
   */
  private handleCurrentSession(
    sessionKey: string, 
    sample: SampleEvent, 
    isIdle: boolean
  ): SessionizedEvent | null {
    const existing = this.openSessions.get(sessionKey);

    if (!existing) {
      return this.startNewSession(sessionKey, sample, isIdle);
    }

    return this.updateExistingSession(existing, sample, isIdle);
  }

  /**
   * Start a new session
   */
  private startNewSession(
    sessionKey: string, 
    sample: SampleEvent, 
    isIdle: boolean
  ): SessionizedEvent {
    const newSession: OpenSession = {
      session_key: sessionKey,
      start_time: sample.timestamp,
      last_time: sample.timestamp,
      is_idle: isIdle,
      is_media_playing: Boolean(sample.is_media_playing),
      window_title: sample.window_title,
      url: sample.url,
      last_sample: cloneSampleEvent(sample),
    };

    this.openSessions.set(sessionKey, newSession);
    this.stats.totalSessionsStarted++;

    return this.createSessionStartEvent(newSession);
  }

  /**
   * Update an existing session
   */
  private updateExistingSession(
    session: OpenSession, 
    sample: SampleEvent, 
    isIdle: boolean
  ): SessionizedEvent | null {
    const lastTime = new Date(session.last_time).getTime();
    const currentTime = new Date(sample.timestamp).getTime();
    const gapSeconds = Math.floor((currentTime - lastTime) / 1000);

    if (isWithinGapThreshold(session.last_time, sample.timestamp, this.options.idleGapThresholdSeconds)) {
      // Update existing session
      session.last_time = sample.timestamp;
      session.is_media_playing = session.is_media_playing || Boolean(sample.is_media_playing);
      
      if (sample.window_title) session.window_title = sample.window_title;
      if (sample.url) session.url = sample.url;
      
      session.last_sample = cloneSampleEvent(sample);

      return this.createSessionUpdateEvent(session);
    } else {
      // Close existing session and start new one
      const endEvent = this.createSessionEndEvent(session, session.last_time);
      this.openSessions.delete(session.session_key);
      this.stats.totalSessionsEnded++;

      const newSession = this.startNewSession(session.session_key, sample, isIdle);
      
      // Return both events (this is a bit of a hack, but it works for the current API)
      // In a more sophisticated implementation, we might want to return multiple events
      return newSession;
    }
  }

  /**
   * Create session started event
   */
  private createSessionStartEvent(session: OpenSession): SessionizedEvent {
    return {
      type: 'session_started',
      session_key: session.session_key,
      start_time: session.start_time,
      end_time: session.last_time,
      duration_seconds: 0,
      is_idle: session.is_idle,
      is_media_playing: session.is_media_playing,
      window_title: session.window_title,
      url: session.url,
    };
  }

  /**
   * Create session updated event
   */
  private createSessionUpdateEvent(session: OpenSession): SessionizedEvent {
    const durationSeconds = calculateDurationSeconds(session.start_time, session.last_time);
    
    return {
      type: 'session_updated',
      session_key: session.session_key,
      start_time: session.start_time,
      end_time: session.last_time,
      duration_seconds: durationSeconds,
      is_idle: session.is_idle,
      is_media_playing: session.is_media_playing,
      window_title: session.window_title,
      url: session.url,
    };
  }

  /**
   * Create session ended event
   */
  private createSessionEndEvent(session: OpenSession, endTime: string): SessionizedEvent {
    const durationSeconds = calculateDurationSeconds(session.start_time, endTime);
    
    return {
      type: 'session_ended',
      session_key: session.session_key,
      start_time: session.start_time,
      end_time: endTime,
      duration_seconds: durationSeconds,
      is_idle: session.is_idle,
      is_media_playing: session.is_media_playing,
      window_title: session.window_title,
      url: session.url,
    };
  }
}
