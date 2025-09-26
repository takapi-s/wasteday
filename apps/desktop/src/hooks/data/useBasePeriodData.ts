import { useState, useEffect, useMemo, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { WeeklyData, MonthlyData } from '@wasteday/ui';
import { CalendarUtils } from '../../utils/calendarUtils';
import { useCategoryEventEmitter } from '../utils';
import type {
  BasePeriodDataState,
  BasePeriodDataHookOptions,
  PeriodType,
  LocalSession,
  ExtensionSession,
  BaseCategory,
} from './types';

export const useBasePeriodDataHook = <T>(
  options: BasePeriodDataHookOptions
): BasePeriodDataState<T> => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(options.offset !== undefined);
  const [error, setError] = useState<string | null>(null);

  const { subscribe } = useCategoryEventEmitter();

  const memoizedOptions = useMemo(() => ({
    dataSource: options.dataSource,
    periodType: options.periodType,
    offset: options.offset ?? 0,
    cacheKey: options.cacheKey,
    autoRefresh: options.autoRefresh ?? true,
    refreshInterval: options.refreshInterval ?? 300000,
  }), [options.dataSource, options.periodType, options.offset, options.cacheKey, options.autoRefresh, options.refreshInterval]);

  const calculatePeriodRange = useCallback((offset: number, periodType: PeriodType) => {
    return CalendarUtils.calculatePeriodRange(offset, periodType);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (memoizedOptions.offset === undefined) {
        setLoading(false);
        setError(null);
        return;
      }

      const { start, end } = calculatePeriodRange(memoizedOptions.offset, memoizedOptions.periodType);

      // 前期間の範囲を算出
      let prevStart: Date;
      let prevEnd: Date;
      if (memoizedOptions.periodType === 'weekly') {
        prevStart = new Date(start);
        prevStart.setDate(start.getDate() - 7);
        prevEnd = new Date(prevStart);
        prevEnd.setDate(prevStart.getDate() + 6);
      } else {
        // monthly: 前月の1日〜末日
        prevStart = new Date(start);
        prevStart.setMonth(start.getMonth() - 1);
        prevStart.setDate(1);
        prevEnd = new Date(start);
        prevEnd.setDate(0); // 前月末日
      }

      const [sessions, prevSessions, categories] = await Promise.all([
        memoizedOptions.dataSource === 'local' 
          ? invoke<LocalSession[]>('db_get_sessions', {
              query: { since: start.toISOString(), until: end.toISOString() }
            })
          : invoke<ExtensionSession[]>('db_get_browsing_sessions', {
              query: { since: start.toISOString(), until: end.toISOString() }
            }),
        memoizedOptions.dataSource === 'local'
          ? invoke<LocalSession[]>('db_get_sessions', {
              query: { since: prevStart.toISOString(), until: prevEnd.toISOString() }
            })
          : invoke<ExtensionSession[]>('db_get_browsing_sessions', {
              query: { since: prevStart.toISOString(), until: prevEnd.toISOString() }
            }),
        invoke<BaseCategory[]>('db_list_waste_categories'),
      ]);

      const processedData = await processPeriodData(sessions, categories, memoizedOptions.offset, memoizedOptions.periodType);

      // 前期間合計の算出（waste / productive）
      const summarize = (src: (LocalSession | ExtensionSession)[], cats: BaseCategory[]) => {
        let waste = 0;
        let productive = 0;
        for (const s of src) {
          const isWaste = cats.some(cat => {
            if (!cat.is_active) return false;
            if ('session_key' in s) {
              return cat.type === s.session_key.split(';')[0].split('=')[1] &&
                     cat.identifier === s.session_key.split(';')[1].split('=')[1] &&
                     cat.label === 'waste';
            }
            if ('domain' in s) {
              return cat.type === 'domain' && cat.identifier === s.domain && cat.label === 'waste';
            }
            return false;
          });
          if (isWaste) waste += s.duration_seconds; else productive += s.duration_seconds;
        }
        return { waste, productive };
      };

      const prevTotals = summarize(prevSessions, categories);

      // 変化率を付与
      let finalData: any = processedData as any;
      if (memoizedOptions.periodType === 'weekly') {
        const currentWaste = (finalData?.totalWasteSeconds ?? 0) as number;
        const currentProductive = (finalData?.totalProductiveSeconds ?? 0) as number;
        const wowWaste = prevTotals.waste > 0 ? Math.round(((currentWaste - prevTotals.waste) / prevTotals.waste) * 100) : 0;
        const wowProd = prevTotals.productive > 0 ? Math.round(((currentProductive - prevTotals.productive) / prevTotals.productive) * 100) : 0;
        finalData = {
          ...finalData,
          previousWeekComparison: wowWaste,
          previousWeekComparisonProductive: wowProd,
        };
      } else {
        const currentWaste = (finalData?.totalWasteSeconds ?? 0) as number;
        const currentProductive = (finalData?.totalProductiveSeconds ?? 0) as number;
        const momWaste = prevTotals.waste > 0 ? Math.round(((currentWaste - prevTotals.waste) / prevTotals.waste) * 100) : 0;
        const momProd = prevTotals.productive > 0 ? Math.round(((currentProductive - prevTotals.productive) / prevTotals.productive) * 100) : 0;
        finalData = {
          ...finalData,
          previousMonthComparison: momWaste,
          previousMonthComparisonProductive: momProd,
        };
      }

      setData(finalData as T);
      setLoading(false);

    } catch (error) {
      console.error(`Error fetching ${memoizedOptions.periodType} ${memoizedOptions.dataSource} data:`, error);
      setError(error instanceof Error ? error.message : 'Unknown error');
      setLoading(false);
    }
  }, [memoizedOptions, calculatePeriodRange]);

  const processPeriodData = useCallback(async (
    sessions: (LocalSession | ExtensionSession)[],
    _categories: BaseCategory[],
    offset: number,
    periodType: PeriodType
  ): Promise<T> => {
    const { start, end } = calculatePeriodRange(offset, periodType);

    if (periodType === 'weekly') {
      const dailyData: any[] = [];
      for (let i = 0; i < 7; i++) {
        const dayStart = new Date(start);
        dayStart.setDate(start.getDate() + i);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayStart.getDate() + 1);

        const daySessions = sessions.filter(s => {
          const sessionTime = new Date(s.start_time);
          return sessionTime >= dayStart && sessionTime < dayEnd;
        });

        const hourlyData: any[] = [];
        for (let hour = 0; hour < 24; hour++) {
          const hourStart = new Date(dayStart);
          hourStart.setHours(hour, 0, 0, 0);
          const hourEnd = new Date(dayStart);
          hourEnd.setHours(hour + 1, 0, 0, 0);

          const hourSessions = daySessions.filter(s => {
            const sessionStart = new Date(s.start_time);
            const sessionEnd = new Date(sessionStart.getTime() + s.duration_seconds * 1000);
            return sessionStart < hourEnd && sessionEnd > hourStart;
          });

          let wasteSeconds = 0;
          let productiveSeconds = 0;

          for (const session of hourSessions) {
            const sessionStart = new Date(session.start_time);
            const sessionEnd = new Date(sessionStart.getTime() + session.duration_seconds * 1000);
            const overlapStart = new Date(Math.max(sessionStart.getTime(), hourStart.getTime()));
            const overlapEnd = new Date(Math.min(sessionEnd.getTime(), hourEnd.getTime()));
            const overlapSeconds = Math.max(0, Math.floor((overlapEnd.getTime() - overlapStart.getTime()) / 1000));

            const isWaste = _categories.some(cat => {
              if (!cat.is_active) return false;
              if ('session_key' in session) {
                return cat.type === session.session_key.split(';')[0].split('=')[1] &&
                       cat.identifier === session.session_key.split(';')[1].split('=')[1] &&
                       cat.label === 'waste';
              }
              if ('domain' in session) {
                return cat.type === 'domain' &&
                       cat.identifier === session.domain &&
                       cat.label === 'waste';
              }
              return false;
            });

            if (isWaste) {
              wasteSeconds += overlapSeconds;
            } else {
              productiveSeconds += overlapSeconds;
            }
          }

          hourlyData.push({
            hour,
            wasteSeconds,
            productiveSeconds,
            sessions: hourSessions.map(s => {
              const isWaste = _categories.some(cat => {
                if (!cat.is_active) return false;
                if ('session_key' in s) {
                  return cat.type === s.session_key.split(';')[0].split('=')[1] &&
                         cat.identifier === s.session_key.split(';')[1].split('=')[1] &&
                         cat.label === 'waste';
                }
                if ('domain' in s) {
                  return cat.type === 'domain' &&
                         cat.identifier === s.domain &&
                         cat.label === 'waste';
                }
                return false;
              });

              return {
                id: s.id,
                startTime: s.start_time,
                durationSeconds: s.duration_seconds,
                category: 'unknown',
                identifier: 'unknown',
                isWaste,
              };
            }),
          });
        }

        dailyData.push({
          date: dayStart.toISOString(),
          dayOfWeek: dayStart.getDay(),
          hourlyData,
        });
      }

      if ((memoizedOptions.cacheKey || '').includes('calendar')) {
        return {
          weekStart: start.toISOString(),
          dailyData,
        } as T;
      }

      const dailyBreakdown = dailyData.map(d => ({
        date: d.date,
        wasteSeconds: d.hourlyData.reduce((sum: number, h: any) => sum + h.wasteSeconds, 0),
        productiveSeconds: d.hourlyData.reduce((sum: number, h: any) => sum + h.productiveSeconds, 0),
      }));

      const totalWasteSeconds = dailyBreakdown.reduce((sum: number, d: any) => sum + d.wasteSeconds, 0);
      const totalProductiveSeconds = dailyBreakdown.reduce((sum: number, d: any) => sum + d.productiveSeconds, 0);

      return {
        weekStart: start.toISOString(),
        totalWasteSeconds,
        totalProductiveSeconds,
        dailyBreakdown,
        previousWeekComparison: 0,
        goalAchievedDays: 0,
      } as T;
    }

    if (periodType === 'monthly') {
      const weeklyBreakdown: any[] = [];
      const weeksInMonth = Math.ceil((end.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));

      for (let week = 0; week < weeksInMonth; week++) {
        const weekStart = new Date(start);
        weekStart.setDate(start.getDate() + (week * 7));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        const weekSessions = sessions.filter(s => {
          const sessionTime = new Date(s.start_time);
          return sessionTime >= weekStart && sessionTime <= weekEnd;
        });

        let wasteSeconds = 0;
        let productiveSeconds = 0;
        for (const session of weekSessions) {
          const isWaste = _categories.some(cat => {
            if (!cat.is_active) return false;
            if ('session_key' in session) {
              return cat.type === session.session_key.split(';')[0].split('=')[1] &&
                     cat.identifier === session.session_key.split(';')[1].split('=')[1] &&
                     cat.label === 'waste';
            }
            if ('domain' in session) {
              return cat.type === 'domain' &&
                     cat.identifier === session.domain &&
                     cat.label === 'waste';
            }
            return false;
          });
          if (isWaste) {
            wasteSeconds += session.duration_seconds;
          } else {
            productiveSeconds += session.duration_seconds;
          }
        }

        weeklyBreakdown.push({
          weekStart: weekStart.toISOString(),
          wasteSeconds,
          productiveSeconds,
        });
      }

      const calendarDays: any[] = [];
      const firstDayOfMonth = new Date(start);
      const firstSunday = new Date(firstDayOfMonth);
      firstSunday.setDate(firstDayOfMonth.getDate() - firstDayOfMonth.getDay());

      for (let i = 0; i < 42; i++) {
        const currentDate = new Date(firstSunday);
        currentDate.setDate(firstSunday.getDate() + i);

        const daySessions = sessions.filter(s => {
          const sessionTime = new Date(s.start_time);
          return sessionTime.toDateString() === currentDate.toDateString();
        });

        let wasteSeconds = 0;
        let productiveSeconds = 0;
        for (const session of daySessions) {
          const isWaste = _categories.some(cat => {
            if (!cat.is_active) return false;
            if ('session_key' in session) {
              const keyParts = session.session_key.split(';');
              const categoryPart = keyParts.find(part => part.startsWith('category='));
              const identifierPart = keyParts.find(part => part.startsWith('identifier='));
              const sessionType = categoryPart ? categoryPart.split('=')[1] : '';
              const sessionIdentifier = identifierPart ? identifierPart.split('=')[1] : '';
              return cat.type === sessionType &&
                     cat.identifier === sessionIdentifier &&
                     cat.label === 'waste';
            }
            if ('domain' in session) {
              return cat.type === 'domain' &&
                     cat.identifier === session.domain &&
                     cat.label === 'waste';
            }
            return false;
          });
          if (isWaste) {
            wasteSeconds += session.duration_seconds;
          } else {
            productiveSeconds += session.duration_seconds;
          }
        }

        const isCurrentMonth = currentDate.getMonth() === firstDayOfMonth.getMonth();
        calendarDays.push({
          day: currentDate.getDate(),
          isCurrentMonth,
          wasteSeconds,
          productiveSeconds,
          goalAchieved: false,
        });
      }

      const monthlyWasteTotal = calendarDays.reduce((sum: number, d: any) => sum + d.wasteSeconds, 0);
      const monthlyProductiveTotal = calendarDays.reduce((sum: number, d: any) => sum + d.productiveSeconds, 0);

      return {
        month: start.toISOString().substring(0, 7),
        totalWasteSeconds: monthlyWasteTotal,
        totalProductiveSeconds: monthlyProductiveTotal,
        weeklyBreakdown,
        calendarDays,
        previousMonthComparison: 0,
        previousMonthComparisonProductive: 0,
        goalAchievedDays: 0,
      } as T;
    }

    return null as T;
  }, [calculatePeriodRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!memoizedOptions.autoRefresh) return;
    const interval = setInterval(fetchData, memoizedOptions.refreshInterval);
    return () => clearInterval(interval);
  }, [fetchData, memoizedOptions.autoRefresh, memoizedOptions.refreshInterval]);

  useEffect(() => {
    const unsubscribe = subscribe((_event) => {
      setLoading(true);
    });
    return unsubscribe;
  }, [subscribe]);

  return { data, loading, error };
};

export const createWeeklyDataHook = (dataSource: 'local' | 'extension', defaultCacheKey: string) => {
  return (offset?: number) => {
    return useBasePeriodDataHook<WeeklyData>({
      dataSource,
      periodType: 'weekly',
      offset,
      cacheKey: `${defaultCacheKey}-weekly`,
      autoRefresh: true,
      refreshInterval: 300000,
    });
  };
};

export const createMonthlyDataHook = (dataSource: 'local' | 'extension', defaultCacheKey: string) => {
  return (offset?: number) => {
    return useBasePeriodDataHook<MonthlyData>({
      dataSource,
      periodType: 'monthly',
      offset,
      cacheKey: `${defaultCacheKey}-monthly`,
      autoRefresh: true,
      refreshInterval: 300000,
    });
  };
};


