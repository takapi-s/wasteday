/**
 * カテゴリーデータの変更を他のコンポーネントに通知するためのイベントエミッター
 */

type CategoryChangeEvent = {
  type: 'category_updated' | 'category_added' | 'category_deleted' | 'category_active_toggled';
  categoryId?: string;
  payload?: any;
};

class CategoryEventEmitter {
  private listeners: ((event: CategoryChangeEvent) => void)[] = [];

  subscribe(listener: (event: CategoryChangeEvent) => void) {
    this.listeners.push(listener);
    
    // アンサブスクライブ関数を返す
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  emit(event: CategoryChangeEvent) {
    console.log('[CategoryEventEmitter] Emitting event:', event);
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('[CategoryEventEmitter] Error in listener:', error);
      }
    });
  }

  // カテゴリー変更の通知メソッド
  notifyCategoryUpdated(categoryId: string, label: 'waste' | 'neutral' | 'study') {
    this.emit({
      type: 'category_updated',
      categoryId,
      payload: { label }
    });
  }

  notifyCategoryAdded(categoryId: string, category: any) {
    this.emit({
      type: 'category_added',
      categoryId,
      payload: category
    });
  }

  notifyCategoryDeleted(categoryId: string) {
    this.emit({
      type: 'category_deleted',
      categoryId
    });
  }

  notifyCategoryActiveToggled(categoryId: string, isActive: boolean) {
    this.emit({
      type: 'category_active_toggled',
      categoryId,
      payload: { isActive }
    });
  }
}

// シングルトンインスタンス
export const categoryEventEmitter = new CategoryEventEmitter();

/**
 * カテゴリー変更イベントを監視するフック
 */
export const useCategoryEventEmitter = () => {
  const subscribe = (listener: (event: CategoryChangeEvent) => void) => {
    return categoryEventEmitter.subscribe(listener);
  };

  return {
    subscribe,
    notifyCategoryUpdated: categoryEventEmitter.notifyCategoryUpdated.bind(categoryEventEmitter),
    notifyCategoryAdded: categoryEventEmitter.notifyCategoryAdded.bind(categoryEventEmitter),
    notifyCategoryDeleted: categoryEventEmitter.notifyCategoryDeleted.bind(categoryEventEmitter),
    notifyCategoryActiveToggled: categoryEventEmitter.notifyCategoryActiveToggled.bind(categoryEventEmitter),
  };
};
