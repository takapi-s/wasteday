import type { CalendarDay } from '@wasteday/ui';

/**
 * カレンダー表示用のユーティリティ
 * 重複するカレンダーロジックを統合し、最適化する
 */
export class CalendarUtils {
  /**
   * 6週間グリッドのカレンダー日付を生成
   */
  static generateCalendarGrid(
    monthStart: Date,
    _monthEnd: Date,
    sessions: Array<{ start_time: string; duration_seconds: number; [key: string]: any }>,
    isWaste: (session: any) => boolean
  ): CalendarDay[] {
    const calendarDays: CalendarDay[] = [];
    const firstDayOfMonth = new Date(monthStart);
    
    // 月の最初の週の日曜日から開始
    const gridStart = new Date(firstDayOfMonth);
    gridStart.setDate(gridStart.getDate() - firstDayOfMonth.getDay());
    
    // 6週間分の日付を生成（42日）
    for (let i = 0; i < 42; i++) {
      const currentDate = new Date(gridStart);
      currentDate.setDate(gridStart.getDate() + i);
      const isCurrentMonth = currentDate.getMonth() === monthStart.getMonth();
      
      // その日のセッションを取得
      const dayStart = new Date(currentDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);
      
      const daySessions = sessions.filter(s => {
        const sessionDate = new Date(s.start_time);
        return sessionDate >= dayStart && sessionDate <= dayEnd;
      });
      
      let wasteSeconds = 0;
      let productiveSeconds = 0;
      
      for (const session of daySessions) {
        if (!session.duration_seconds || session.duration_seconds <= 0) continue;
        if (isWaste(session)) {
          wasteSeconds += session.duration_seconds;
        } else {
          productiveSeconds += session.duration_seconds;
        }
      }
      
      calendarDays.push({
        day: currentDate.getDate(),
        isCurrentMonth: isCurrentMonth,
        wasteSeconds: wasteSeconds,
        productiveSeconds: productiveSeconds,
      });
    }
    
    return calendarDays;
  }

  /**
   * 週別データを生成
   */
  static generateWeeklyBreakdown(
    monthStart: Date,
    monthEnd: Date,
    sessions: Array<{ start_time: string; duration_seconds: number; [key: string]: any }>,
    isWaste: (session: any) => boolean
  ): Array<{
    weekStart: string;
    totalWasteSeconds: number;
    totalProductiveSeconds: number;
    dailyBreakdown: Array<{ date: string; wasteSeconds: number; productiveSeconds: number }>;
    previousWeekComparison: number;
  }> {
    const weeklyBreakdown = [];
    const weeksInMonth = Math.ceil(monthEnd.getDate() / 7);
    
    for (let week = 0; week < weeksInMonth; week++) {
      const weekStart = new Date(monthStart);
      weekStart.setDate(monthStart.getDate() + (week * 7));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      
      const weekSessions = sessions.filter(s => {
        const sessionDate = new Date(s.start_time);
        return sessionDate >= weekStart && sessionDate < weekEnd;
      });
      
      let weekWasteSeconds = 0;
      let weekProductiveSeconds = 0;
      
      for (const session of weekSessions) {
        if (!session.duration_seconds || session.duration_seconds <= 0) continue;
        if (isWaste(session)) {
          weekWasteSeconds += session.duration_seconds;
        } else {
          weekProductiveSeconds += session.duration_seconds;
        }
      }
      
      // 週内の日別データ
      const dailyBreakdown = [];
      for (let day = 0; day < 7; day++) {
        const dayDate = new Date(weekStart);
        dayDate.setDate(weekStart.getDate() + day);
        if (dayDate.getMonth() === monthStart.getMonth()) {
          const dayStart = new Date(dayDate);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(dayDate);
          dayEnd.setHours(23, 59, 59, 999);
          
          const daySessions = weekSessions.filter(s => {
            const sessionDate = new Date(s.start_time);
            return sessionDate >= dayStart && sessionDate <= dayEnd;
          });
          
          let dayWasteSeconds = 0;
          let dayProductiveSeconds = 0;
          
          for (const session of daySessions) {
            if (!session.duration_seconds || session.duration_seconds <= 0) continue;
            if (isWaste(session)) {
              dayWasteSeconds += session.duration_seconds;
            } else {
              dayProductiveSeconds += session.duration_seconds;
            }
          }
          
          dailyBreakdown.push({
            date: dayDate.toISOString(),
            wasteSeconds: dayWasteSeconds,
            productiveSeconds: dayProductiveSeconds,
          });
        }
      }
      
      weeklyBreakdown.push({
        weekStart: weekStart.toISOString(),
        totalWasteSeconds: weekWasteSeconds,
        totalProductiveSeconds: weekProductiveSeconds,
        dailyBreakdown,
        previousWeekComparison: 0, // 実装は省略
      });
    }
    
    return weeklyBreakdown;
  }

  /**
   * 日別データを生成（週次データ用）
   */
  static generateDailyBreakdown(
    weekStart: Date,
    sessions: Array<{ start_time: string; duration_seconds: number; [key: string]: any }>,
    isWaste: (session: any) => boolean
  ): Array<{ date: string; wasteSeconds: number; productiveSeconds: number }> {
    const dailyBreakdown = [];
    
    for (let i = 0; i < 7; i++) {
      const dayStart = new Date(weekStart);
      dayStart.setDate(weekStart.getDate() + i);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayStart.getDate() + 1);
      
      const daySessions = sessions.filter(s => {
        const sessionDate = new Date(s.start_time);
        return sessionDate >= dayStart && sessionDate < dayEnd;
      });
      
      let wasteSeconds = 0;
      let productiveSeconds = 0;
      
      for (const session of daySessions) {
        if (!session.duration_seconds || session.duration_seconds <= 0) continue;
        if (isWaste(session)) {
          wasteSeconds += session.duration_seconds;
        } else {
          productiveSeconds += session.duration_seconds;
        }
      }
      
      dailyBreakdown.push({
        date: dayStart.toISOString(),
        wasteSeconds,
        productiveSeconds,
      });
    }
    
    return dailyBreakdown;
  }

  /**
   * 期間の開始・終了日を計算
   */
  static calculatePeriodRange(offset: number, periodType: 'weekly' | 'monthly'): { start: Date; end: Date } {
    const now = new Date();
    
    if (periodType === 'weekly') {
      const currentWeekStart = new Date(now);
      currentWeekStart.setDate(now.getDate() - now.getDay()); // 今週の日曜日
      currentWeekStart.setHours(0, 0, 0, 0);
      
      const targetWeekStart = new Date(currentWeekStart);
      targetWeekStart.setDate(currentWeekStart.getDate() + (offset * 7));
      
      const targetWeekEnd = new Date(targetWeekStart);
      targetWeekEnd.setDate(targetWeekStart.getDate() + 6);
      targetWeekEnd.setHours(23, 59, 59, 999);
      
      return { start: targetWeekStart, end: targetWeekEnd };
    } else {
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const targetMonthStart = new Date(currentMonthStart);
      targetMonthStart.setMonth(currentMonthStart.getMonth() + offset);
      
      const targetMonthEnd = new Date(targetMonthStart);
      targetMonthEnd.setMonth(targetMonthStart.getMonth() + 1);
      targetMonthEnd.setDate(0); // 前月の最終日
      targetMonthEnd.setHours(23, 59, 59, 999);
      
      return { start: targetMonthStart, end: targetMonthEnd };
    }
  }

  /**
   * セッションキーを解析（ローカルセッション用）
   */
  static parseSessionKey(key: string): { category?: string; identifier?: string; user_state?: string } {
    const obj: Record<string, string> = {};
    for (const part of key.split(';')) {
      const [k, v] = part.split('=');
      if (k && v) obj[k] = v;
    }
    return { category: obj['category'], identifier: obj['identifier'], user_state: obj['user_state'] };
  }

  /**
   * カテゴリ判定ロジック（ローカルセッション用）
   */
  static isWasteLocal(
    type: string | undefined, 
    identifier: string | undefined, 
    categories: Array<{ is_active: boolean; type: string; identifier: string; label: string }>
  ): boolean {
    if (!type || !identifier) return false;
    const t = (type || '').toLowerCase();
    const id = (identifier || '').toLowerCase();
    return categories.some(c => 
      c.is_active && 
      c.type.toLowerCase() === t && 
      (c.identifier || '').toLowerCase() === id && 
      c.label === 'waste'
    );
  }

  /**
   * カテゴリ判定ロジック（拡張機能セッション用）
   */
  static isWasteExtension(
    domain: string, 
    categories: Array<{ is_active: boolean; type: string; identifier: string; label: string }>
  ): boolean {
    const d = (domain || '').toLowerCase();
    for (const c of categories) {
      if (!c.is_active) continue;
      if ((c.type || '').toLowerCase() !== 'domain') continue;
      if ((c.identifier || '').toLowerCase() !== d) continue;
      return c.label === 'waste';
    }
    return false;
  }
}
