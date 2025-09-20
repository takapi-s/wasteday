/**
 * @wasteday/localdb - SQLite local database package
 * 
 * Provides TypeScript types, interfaces, and utilities for local database operations
 * in the Wasteday desktop application.
 */

// Core types and interfaces
export * from './types';
export * from './api';

// Error handling
export * from './errors';

// Validation utilities
export * from './validators';

// Repository implementations
export * from './implementations/base-repository';
export * from './implementations/tauri-repository';

// Utility functions
export * from './utils';

// Schema information
export const schemaSqlPath = 'src/schema.sqlite.sql';

// Factory function for creating repository instances
export const createTauriRepository = () => {
  const { TauriLocalDbRepository } = require('./implementations/tauri-repository');
  return new TauriLocalDbRepository();
};

