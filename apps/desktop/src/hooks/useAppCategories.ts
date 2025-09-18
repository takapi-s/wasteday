import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { AppCategory } from '@wasteday/ui';

type AppCategoriesData = {
  categories: AppCategory[];
  discovered: { type: 'app' | 'domain'; identifier: string; lastSeen: string; count: number }[];
  loading: boolean;
  error: string | null;
};

export const useAppCategories = (): AppCategoriesData & {
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
    if (!supabase) {
      setData(prev => ({ ...prev, loading: false, error: 'Supabase not configured' }));
      return;
    }

    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      const client = supabase as NonNullable<typeof supabase>;
      const { data: categories, error } = await client
        .from('waste_categories')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        throw error;
      }

      // 過去30日のセッションから未登録のidentifierを検出
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const { data: recentSessions, error: sErr } = await client
        .from('sessions')
        .select('session_key,start_time')
        .gte('start_time', since.toISOString());
      if (sErr) throw sErr;
      const known = new Set((categories || []).map(c => `${c.type}::${(c.identifier || '').toLowerCase()}`));
      const counter = new Map<string, { type: 'app' | 'domain'; identifier: string; lastSeen: string; count: number }>();
      for (const s of recentSessions || []) {
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
        categories: categories || [],
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
    if (!supabase) return;

    try {
      const client = supabase as NonNullable<typeof supabase>;
      const { error } = await client
        .from('waste_categories')
        .update({ label, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        throw error;
      }

      // ローカル状態を更新
      setData(prev => ({
        ...prev,
        categories: prev.categories.map(cat =>
          cat.id === id ? { ...cat, label, updated_at: new Date().toISOString() } : cat
        )
      }));

    } catch (err) {
      console.error('Failed to update category:', err);
      throw err;
    }
  };

  const toggleActive = async (id: string, is_active: boolean) => {
    if (!supabase) return;

    try {
      const client = supabase as NonNullable<typeof supabase>;
      const { error } = await client
        .from('waste_categories')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        throw error;
      }

      // ローカル状態を更新
      setData(prev => ({
        ...prev,
        categories: prev.categories.map(cat =>
          cat.id === id ? { ...cat, is_active, updated_at: new Date().toISOString() } : cat
        )
      }));

    } catch (err) {
      console.error('Failed to toggle active status:', err);
      throw err;
    }
  };

  const addCategory = async (payload: { name: string; type: 'app' | 'domain'; identifier: string; label?: 'waste' | 'neutral' | 'study' }) => {
    if (!supabase) return;
    try {
      const client = supabase as NonNullable<typeof supabase>;
      const { data: inserted, error } = await client
        .from('waste_categories')
        .insert({
          name: payload.name || payload.identifier,
          type: payload.type,
          identifier: payload.identifier,
          label: payload.label || 'neutral',
          is_active: true,
        })
        .select('*')
        .single();
      if (error) throw error;
      setData(prev => ({
        ...prev,
        categories: [...prev.categories, inserted as any],
        discovered: prev.discovered.filter(d => !(d.type === payload.type && d.identifier.toLowerCase() === payload.identifier.toLowerCase())),
      }));
    } catch (err) {
      console.error('Failed to add category:', err);
      throw err;
    }
  };

  const deleteCategory = async (id: string) => {
    if (!supabase) return;
    try {
      const client = supabase as NonNullable<typeof supabase>;
      const { error } = await client
        .from('waste_categories')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setData(prev => ({
        ...prev,
        categories: prev.categories.filter(cat => cat.id !== id),
      }));
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
