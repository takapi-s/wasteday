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
  toggleActive: (id: string, is_active: boolean) => Promise<void>;
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
      const appCategories: AppCategory[] = categories.map(cat => ({
        id: String(cat.id || ''),
        name: cat.identifier, // SQLite版では name フィールドがないので identifier を代用
        type: cat.type as 'app' | 'domain',
        identifier: cat.identifier,
        label: cat.label === 'waste' ? 'waste' : cat.label === 'productive' ? 'study' : 'neutral',
        is_active: cat.is_active,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      // 過去30日のセッションから未登録のidentifierを検出
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
        if (!identifier) continue;
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

      // カテゴリー変更後にデータを再取得して他画面への反映を確実にする
      console.log('[useLocalAppCategories] Category updated, refreshing data...');
      await fetchCategories();

      // 他のコンポーネントに変更を通知
      categoryEventEmitter.notifyCategoryUpdated(id, label);

    } catch (err) {
      console.error('Failed to update category:', err);
      throw err;
    }
  };

  const toggleActive = async (id: string, is_active: boolean) => {
    try {
      const categories = await invoke<LocalWasteCategory[]>('db_list_waste_categories');
      const existing = categories.find(c => String(c.id) === id);
      if (!existing) throw new Error('Category not found');

      const category: LocalWasteCategory = {
        ...existing,
        is_active,
      };

      await invoke('db_upsert_waste_category', { cat: category });

      // ローカル状態を更新
      setData(prev => ({
        ...prev,
        categories: prev.categories.map(cat =>
          cat.id === id ? { ...cat, is_active, updated_at: new Date().toISOString() } : cat
        )
      }));

      // アクティブ状態変更後にデータを再取得
      console.log('[useLocalAppCategories] Active status updated, refreshing data...');
      await fetchCategories();

      // 他のコンポーネントに変更を通知
      categoryEventEmitter.notifyCategoryActiveToggled(id, is_active);

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

      // ローカル状態を更新
      const newCategory: AppCategory = {
        id: Date.now().toString(), // 仮のID
        name: payload.name || payload.identifier,
        type: payload.type,
        identifier: payload.identifier,
        label: payload.label || 'neutral',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setData(prev => ({
        ...prev,
        categories: [...prev.categories, newCategory],
        discovered: prev.discovered.filter(d => !(d.type === payload.type && d.identifier.toLowerCase() === payload.identifier.toLowerCase())),
      }));

      // カテゴリー追加後にデータを再取得して他画面への反映を確実にする
      console.log('[useLocalAppCategories] Category added, refreshing data...');
      await fetchCategories();

      // 他のコンポーネントに変更を通知
      categoryEventEmitter.notifyCategoryAdded(newCategory.id, newCategory);

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

      // カテゴリー削除後にデータを再取得
      console.log('[useLocalAppCategories] Category deleted, refreshing data...');
      await fetchCategories();

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

