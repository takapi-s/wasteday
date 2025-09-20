/**
 * Error definitions for @wasteday/ingest package
 */

export class IngestError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'IngestError';
  }
}

export class ValidationError extends IngestError {
  constructor(message: string, public readonly field?: string) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class ConfigurationError extends IngestError {
  constructor(message: string) {
    super(message, 'CONFIGURATION_ERROR');
    this.name = 'ConfigurationError';
  }
}

export class SessionError extends IngestError {
  constructor(message: string, public readonly sessionKey?: string) {
    super(message, 'SESSION_ERROR');
    this.name = 'SessionError';
  }
}

export class WriterError extends IngestError {
  constructor(message: string, cause?: Error) {
    super(message, 'WRITER_ERROR', cause);
    this.name = 'WriterError';
  }
}

export type IngestErrorCode = 
  | 'VALIDATION_ERROR'
  | 'CONFIGURATION_ERROR'
  | 'SESSION_ERROR'
  | 'WRITER_ERROR'
  | 'UNKNOWN_ERROR';
