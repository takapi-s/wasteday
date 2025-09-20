/**
 * Base repository implementation with common functionality
 */

import type { RepositoryResult } from '../types';
import { DatabaseError, ValidationError } from '../errors';
import { validateSession, validateWasteCategory, validateUserSettings } from '../validators';

export abstract class BaseRepository {
  /**
   * Create a successful result
   */
  protected success<T>(data?: T): RepositoryResult<T> {
    return {
      data,
      success: true
    };
  }

  /**
   * Create an error result
   */
  protected error(message: string, cause?: Error): RepositoryResult<never> {
    return {
      error: message,
      success: false
    };
  }

  /**
   * Wrap async operation with error handling
   */
  protected async wrapOperation<T>(
    operation: () => Promise<T>,
    errorMessage: string
  ): Promise<RepositoryResult<T>> {
    try {
      const data = await operation();
      return this.success(data);
    } catch (error) {
      if (error instanceof ValidationError) {
        return this.error(error.message, error);
      }
      
      const dbError = new DatabaseError(errorMessage, error as Error);
      return this.error(dbError.message, dbError);
    }
  }

  /**
   * Validate and transform session data
   */
  protected validateSessionData(session: any) {
    try {
      return validateSession(session);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(`Invalid session data: ${error}`);
    }
  }

  /**
   * Validate and transform waste category data
   */
  protected validateWasteCategoryData(category: any) {
    try {
      return validateWasteCategory(category);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(`Invalid waste category data: ${error}`);
    }
  }

  /**
   * Validate and transform user settings data
   */
  protected validateUserSettingsData(settings: any) {
    try {
      return validateUserSettings(settings);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(`Invalid user settings data: ${error}`);
    }
  }

  /**
   * Parse session key string into components
   */
  protected parseSessionKeyComponents(sessionKey: string): Record<string, string> {
    const parts = sessionKey.split(';');
    const result: Record<string, string> = {};

    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key && value) {
        result[key.trim()] = value.trim();
      }
    }

    return result;
  }

  /**
   * Validate session key format
   */
  protected isValidSessionKey(sessionKey: string): boolean {
    try {
      const components = this.parseSessionKeyComponents(sessionKey);
      return !!(components.category && components.identifier);
    } catch {
      return false;
    }
  }
}
