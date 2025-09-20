/**
 * Repository interfaces for LocalDB operations
 */

import type { 
  Session, 
  WasteCategory, 
  UserSettings, 
  SessionQueryParams,
  SessionKeyComponents,
  RepositoryResult,
  IsoTimestamp
} from './types';

/**
 * Main repository interface for LocalDB operations
 */
export interface LocalDbRepository {
  // Session operations
  upsertSession(session: Session): Promise<RepositoryResult<void>>;
  getSessions(params?: SessionQueryParams): Promise<RepositoryResult<Session[]>>;
  deleteSession(id: string): Promise<RepositoryResult<void>>;
  getSessionById(id: string): Promise<RepositoryResult<Session | null>>;

  // Category operations
  listWasteCategories(): Promise<RepositoryResult<WasteCategory[]>>;
  getWasteCategoryById(id: number): Promise<RepositoryResult<WasteCategory | null>>;
  upsertWasteCategory(category: WasteCategory): Promise<RepositoryResult<void>>;
  deleteWasteCategory(id: number): Promise<RepositoryResult<void>>;
  getActiveWasteCategories(): Promise<RepositoryResult<WasteCategory[]>>;

  // Settings operations
  getUserSettings(): Promise<RepositoryResult<UserSettings>>;
  saveUserSettings(settings: UserSettings): Promise<RepositoryResult<void>>;
  getSettingValue(key: string): Promise<RepositoryResult<string | null>>;
  setSettingValue(key: string, value: string): Promise<RepositoryResult<void>>;

  // Utility operations
  parseSessionKey(sessionKey: string): SessionKeyComponents;
  validateSessionKey(sessionKey: string): boolean;
}

/**
 * Database connection interface
 */
export interface DatabaseConnection {
  isConnected(): Promise<boolean>;
  initialize(): Promise<void>;
  close(): Promise<void>;
  executeQuery<T>(query: string, params?: any[]): Promise<T[]>;
  executeCommand(command: string, params?: any[]): Promise<void>;
}

/**
 * Repository factory interface
 */
export interface RepositoryFactory {
  createRepository(): LocalDbRepository;
  createConnection(): DatabaseConnection;
}

// Re-export types for convenience
export type { 
  Session, 
  WasteCategory, 
  UserSettings, 
  SessionQueryParams,
  SessionKeyComponents,
  RepositoryResult,
  IsoTimestamp
};

