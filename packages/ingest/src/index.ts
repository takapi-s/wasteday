/**
 * @wasteday/ingest - Sample processing and session management package
 * 
 * Provides functionality for processing sample events and managing user activity sessions
 * with configurable thresholds and session lifecycle management.
 */

// Core types and interfaces
export * from './types';

// Error handling
export * from './errors';

// Configuration management
export * from './config';

// Validation utilities
export * from './validators';

// Utility functions
export * from './utils';

// Main service class
export { IngestService } from './ingest-service';

// Session management
export { SessionManager } from './session-manager';

// Session writers
export * from './writer';

// Database utilities
export * from './db';

// Development utilities
export * from './dev';


