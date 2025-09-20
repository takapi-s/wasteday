/**
 * Tauri-based repository implementation
 * This implementation uses Tauri's invoke API to communicate with Rust backend
 */

import { invoke } from '@tauri-apps/api/core';
import type { 
  LocalDbRepository,
  Session, 
  WasteCategory, 
  UserSettings,
  SessionQueryParams,
  SessionKeyComponents,
  RepositoryResult
} from '../api';
import { BaseRepository } from './base-repository';
import { NotFoundError } from '../errors';

export class TauriLocalDbRepository extends BaseRepository implements LocalDbRepository {
  
  // Session operations
  async upsertSession(session: Session): Promise<RepositoryResult<void>> {
    return this.wrapOperation(async () => {
      const validatedSession = this.validateSessionData(session);
      await invoke('db_upsert_session', { session: validatedSession });
    }, 'Failed to upsert session');
  }

  async getSessions(params?: SessionQueryParams): Promise<RepositoryResult<Session[]>> {
    return this.wrapOperation(async () => {
      const query = params || {};
      const sessions = await invoke<Session[]>('db_get_sessions', { query });
      return sessions;
    }, 'Failed to get sessions');
  }

  async deleteSession(id: string): Promise<RepositoryResult<void>> {
    return this.wrapOperation(async () => {
      await invoke('db_delete_session', { id });
    }, 'Failed to delete session');
  }

  async getSessionById(id: string): Promise<RepositoryResult<Session | null>> {
    return this.wrapOperation(async () => {
      try {
        const session = await invoke<Session>('db_get_session_by_id', { id });
        return session;
      } catch (error) {
        // If session not found, return null instead of throwing
        if (error instanceof Error && error.message.includes('not found')) {
          return null;
        }
        throw error;
      }
    }, 'Failed to get session by id');
  }

  // Category operations
  async listWasteCategories(): Promise<RepositoryResult<WasteCategory[]>> {
    return this.wrapOperation(async () => {
      const categories = await invoke<WasteCategory[]>('db_list_waste_categories');
      return categories;
    }, 'Failed to list waste categories');
  }

  async getWasteCategoryById(id: number): Promise<RepositoryResult<WasteCategory | null>> {
    return this.wrapOperation(async () => {
      try {
        const category = await invoke<WasteCategory>('db_get_waste_category_by_id', { id });
        return category;
      } catch (error) {
        if (error instanceof Error && error.message.includes('not found')) {
          return null;
        }
        throw error;
      }
    }, 'Failed to get waste category by id');
  }

  async upsertWasteCategory(category: WasteCategory): Promise<RepositoryResult<void>> {
    return this.wrapOperation(async () => {
      const validatedCategory = this.validateWasteCategoryData(category);
      await invoke('db_upsert_waste_category', { cat: validatedCategory });
    }, 'Failed to upsert waste category');
  }

  async deleteWasteCategory(id: number): Promise<RepositoryResult<void>> {
    return this.wrapOperation(async () => {
      await invoke('db_delete_waste_category', { id });
    }, 'Failed to delete waste category');
  }

  async getActiveWasteCategories(): Promise<RepositoryResult<WasteCategory[]>> {
    return this.wrapOperation(async () => {
      const allCategories = await invoke<WasteCategory[]>('db_list_waste_categories');
      return allCategories.filter(cat => cat.is_active);
    }, 'Failed to get active waste categories');
  }

  // Settings operations
  async getUserSettings(): Promise<RepositoryResult<UserSettings>> {
    return this.wrapOperation(async () => {
      const settings = await invoke<UserSettings>('db_get_user_settings');
      return settings;
    }, 'Failed to get user settings');
  }

  async saveUserSettings(settings: UserSettings): Promise<RepositoryResult<void>> {
    return this.wrapOperation(async () => {
      const validatedSettings = this.validateUserSettingsData(settings);
      await invoke('db_save_user_settings', { settings: validatedSettings });
    }, 'Failed to save user settings');
  }

  async getSettingValue(key: string): Promise<RepositoryResult<string | null>> {
    return this.wrapOperation(async () => {
      try {
        const value = await invoke<string>('db_get_setting_value', { key });
        return value;
      } catch (error) {
        if (error instanceof Error && error.message.includes('not found')) {
          return null;
        }
        throw error;
      }
    }, 'Failed to get setting value');
  }

  async setSettingValue(key: string, value: string): Promise<RepositoryResult<void>> {
    return this.wrapOperation(async () => {
      await invoke('db_set_setting_value', { key, value });
    }, 'Failed to set setting value');
  }

  // Utility operations
  parseSessionKey(sessionKey: string): SessionKeyComponents {
    const components = this.parseSessionKeyComponents(sessionKey);
    
    if (!components.category || !components.identifier) {
      throw new Error('Invalid session key: missing required components');
    }

    return {
      category: components.category as 'app' | 'browser' | 'system',
      identifier: components.identifier,
      user_state: (components.user_state as 'active' | 'idle') || 'active',
      window_title: components.window_title,
      url: components.url
    };
  }

  validateSessionKey(sessionKey: string): boolean {
    return this.isValidSessionKey(sessionKey);
  }
}
