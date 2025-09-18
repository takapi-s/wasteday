import type { Session, WasteCategory, UserSettings } from './types';

export interface LocalDbRepository {
  // sessions
  upsertSession(session: Session): Promise<void>;
  getSessions(params: { since?: string; until?: string }): Promise<Session[]>;
  deleteSession(id: string): Promise<void>;

  // categories
  listWasteCategories(): Promise<WasteCategory[]>;
  upsertWasteCategory(cat: WasteCategory): Promise<void>;
  deleteWasteCategory(id: number): Promise<void>;

  // settings
  getUserSettings(): Promise<UserSettings>;
  saveUserSettings(settings: UserSettings): Promise<void>;
}

export type { Session, WasteCategory, UserSettings };

