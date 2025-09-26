import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { AppCategory } from '@wasteday/ui';
import { categoryEventEmitter } from './useCategoryEventEmitter';

type AppCategoriesData = {
  categories: AppCategory[];
  discovered: { type: 'app' | 'domain'; identifier: string; lastSeen: string; count: number }[];
  loading: boolean;
  error: string | null;
};

type LocalWasteCategory = {
  id?: number;
  type: string;
  identifier: string;
  label: 'waste' | 'productive' | string;
  is_active: boolean;
};

type LocalSession = {
  id: string;
  start_time: string;
  duration_seconds: number;
  session_key: string;
};

export const useLocalAppCategories = (): AppCategoriesData & {
  updateCategory: (id: string, label: 'waste' | 'neutral' | 'study') => Promise<void>;
  toggleActive: (id: string, active: boolean) => Promise<void>;
  addCategory: (payload: { name: string; type: 'app' | 'domain'; identifier: string; label?: 'waste' | 'neutral' | 'study' }) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
} => {
  const [data, setData] = useState<AppCategoriesData>({
    categories: [],
    discovered: [],
    loading: true,
    error: null,
  });

  const fetchCategories = async () => {
    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      const [categories, sessions] = await Promise.all([
        invoke<LocalWasteCategory[]>('db_list_waste_categories'),
        invoke<LocalSession[]>('db_get_sessions', { 
          query: { 
            since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() 
          } 
        }),
      ]);

      // カテゴリをAppCategory形式に変換
      console.log('[useLocalAppCategories] Raw categories from DB:', categories);
      
      const mapped: AppCategory[] = categories.map(cat => {
        // identifierが空や不正な値の場合は、より適切な名前を生成
        let displayName = cat.identifier;
        if (!displayName || displayName === '(app)' || displayName === '(domain)' || displayName.length < 2) {
          // より分かりやすい名前を生成
          if (cat.type === 'app') {
            displayName = `Unknown Application (${cat.identifier || 'unknown'})`;
          } else if (cat.type === 'domain') {
            displayName = `Unknown Domain (${cat.identifier || 'unknown'})`;
          } else {
            displayName = `${cat.type}: ${cat.identifier || 'unknown'}`;
          }
        }
        
        return {
          id: String(cat.id || ''),
          name: displayName,
          type: cat.type as 'app' | 'domain',
          identifier: cat.identifier,
          label: cat.label === 'waste' ? 'waste' : cat.label === 'productive' ? 'study' : 'neutral',
          active: cat.is_active,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      });
      // 重複排除: type+identifier(小文字) でユニーク化
      const uniqueMap = new Map<string, AppCategory>();
      for (const c of mapped) {
        const key = `${c.type}::${(c.identifier || '').toLowerCase()}`;
        // 既に存在する場合は、idがある方/より新しいupdated_atを優先
        const prev = uniqueMap.get(key);
        if (!prev) {
          uniqueMap.set(key, c);
        } else {
          const pick = prev.id ? prev : c.id ? c : (new Date(c.updated_at) > new Date(prev.updated_at) ? c : prev);
          uniqueMap.set(key, pick);
        }
      }
      const appCategories: AppCategory[] = Array.from(uniqueMap.values());
      
      console.log('[useLocalAppCategories] Processed app categories:', appCategories);

      // 過去30日のセッションから未登録のidentifierを検出
      console.log('[useLocalAppCategories] Analyzing sessions:', sessions.length);
      
      const known = new Set(categories.map(c => `${c.type}::${(c.identifier || '').toLowerCase()}`));
      const counter = new Map<string, { type: 'app' | 'domain'; identifier: string; lastSeen: string; count: number }>();
      
      for (const s of sessions) {
        const key = String(s.session_key || '');
        const parts = key.split(';').reduce((acc: any, p: string) => {
          const [k, v] = p.split('=');
          if (k && v) acc[k] = v;
          return acc;
        }, {} as any);
        const type = (parts['category'] as 'app' | 'domain') || 'app';
        const identifier = (parts['identifier'] as string) || '';
        
        // デバッグ: 不正なidentifierをログ出力
        if (!identifier || identifier === '(app)' || identifier === '(domain)') {
          console.log('[useLocalAppCategories] Invalid identifier found:', { key, parts, type, identifier });
          continue;
        }
        
        const k2 = `${type}::${identifier.toLowerCase()}`;
        if (known.has(k2)) continue;
        const prev = counter.get(k2);
        const lastSeen = String(s.start_time || new Date().toISOString());
        if (prev) {
          prev.count += 1;
          if (lastSeen > prev.lastSeen) prev.lastSeen = lastSeen;
        } else {
          counter.set(k2, { type, identifier, lastSeen, count: 1 });
        }
      }
      
      console.log('[useLocalAppCategories] Discovered identifiers:', Array.from(counter.values()));

      setData({
        categories: appCategories,
        discovered: Array.from(counter.values()).sort((a, b) => b.count - a.count),
        loading: false,
        error: null,
      });

    } catch (err) {
      console.error('Failed to fetch app categories:', err);
      setData(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      }));
    }
  };

  const updateCategory = async (id: string, label: 'waste' | 'neutral' | 'study') => {
    try {
      const localLabel = label === 'waste' ? 'waste' : label === 'study' ? 'productive' : 'neutral';
      const category: LocalWasteCategory = {
        id: parseInt(id, 10),
        type: 'app', // デフォルト
        identifier: '',
        label: localLabel,
        is_active: true,
      };
      
      // 既存カテゴリの情報を取得してから更新
      const categories = await invoke<LocalWasteCategory[]>('db_list_waste_categories');
      const existing = categories.find(c => String(c.id) === id);
      if (existing) {
        category.type = existing.type;
        category.identifier = existing.identifier;
        category.is_active = existing.is_active;
      }

      await invoke('db_upsert_waste_category', { cat: category });

      // ローカル状態を更新
      setData(prev => ({
        ...prev,
        categories: prev.categories.map(cat =>
          cat.id === id ? { ...cat, label, updated_at: new Date().toISOString() } : cat
        )
      }));

      // 他のコンポーネントに変更を通知
      categoryEventEmitter.notifyCategoryUpdated(id, label);

    } catch (err) {
      console.error('Failed to update category:', err);
      throw err;
    }
  };

  const toggleActive = async (id: string, active: boolean) => {
    try {
      const categories = await invoke<LocalWasteCategory[]>('db_list_waste_categories');
      const existing = categories.find(c => String(c.id) === id);
      if (!existing) throw new Error('Category not found');

      const category: LocalWasteCategory = {
        ...existing,
        is_active: active,
      };

      await invoke('db_upsert_waste_category', { cat: category });

      // ローカル状態を更新
      setData(prev => ({
        ...prev,
        categories: prev.categories.map(cat =>
          cat.id === id ? { ...cat, active: active, updated_at: new Date().toISOString() } : cat
        )
      }));

      // 他のコンポーネントに変更を通知
      categoryEventEmitter.notifyCategoryActiveToggled(id, active);

    } catch (err) {
      console.error('Failed to toggle active status:', err);
      throw err;
    }
  };

  const addCategory = async (payload: { name: string; type: 'app' | 'domain'; identifier: string; label?: 'waste' | 'neutral' | 'study' }) => {
    try {
      const localLabel = payload.label === 'waste' ? 'waste' : payload.label === 'study' ? 'productive' : 'neutral';
      const category: LocalWasteCategory = {
        type: payload.type,
        identifier: payload.identifier,
        label: localLabel,
        is_active: true,
      };

      await invoke('db_upsert_waste_category', { cat: category });

      // 追加されたカテゴリの実際のIDを取得するために、データベースから最新の情報を取得
      const updatedCategories = await invoke<LocalWasteCategory[]>('db_list_waste_categories');
      const addedCategory = updatedCategories.find(cat => 
        cat.identifier === payload.identifier && cat.type === payload.type
      );

      if (addedCategory) {
        // 既存同一キーのものは置き換え
        const keyToReplace = `${payload.type}::${payload.identifier.toLowerCase()}`;
        const filtered = (prev: any) => prev.categories.filter((cat: any) => `${cat.type}::${(cat.identifier || '').toLowerCase()}` !== keyToReplace);
        const newCategory: AppCategory = {
          id: String(addedCategory.id),
          name: payload.name || payload.identifier,
          type: payload.type,
          identifier: payload.identifier,
          label: payload.label || 'neutral',
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        setData(prev => ({
          ...prev,
          categories: [...filtered(prev), newCategory],
          discovered: prev.discovered.filter(d => !(d.type === payload.type && d.identifier.toLowerCase() === payload.identifier.toLowerCase())),
        }));

        // 他のコンポーネントに変更を通知
        categoryEventEmitter.notifyCategoryAdded(newCategory.id, newCategory);
      }

    } catch (err) {
      console.error('Failed to add category:', err);
      throw err;
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      await invoke('db_delete_waste_category', { id: parseInt(id, 10) });
      setData(prev => ({
        ...prev,
        categories: prev.categories.filter(cat => cat.id !== id),
      }));

      // 他のコンポーネントに変更を通知
      categoryEventEmitter.notifyCategoryDeleted(id);

    } catch (err) {
      console.error('Failed to delete category:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  return {
    ...data,
    updateCategory,
    toggleActive,
    addCategory,
    deleteCategory,
  };
};

