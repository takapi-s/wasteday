import { create } from 'zustand';
import type { AuthenticatedUser } from '../lib/auth.server';

interface UserStore {
  // ユーザー情報（テナント1:1）
  user: AuthenticatedUser | null;

  // 状態管理
  isInitialized: boolean;

  // アクション
  setUser: (user: AuthenticatedUser | null) => void;
  initializeUser: (user: AuthenticatedUser | null) => void;
  clearUser: () => void;

  // 便利メソッド
  getTenantName: () => string;
}

export const useUserStore = create<UserStore>((set, get) => ({
  // 初期状態
  user: null,
  isInitialized: false,

  // アクション
  setUser: (user: AuthenticatedUser | null) => {
    set({ user });
  },

  initializeUser: (incomingUser) => {
    const { user, isInitialized } = get();
    if (
      isInitialized &&
      user?.id === incomingUser?.id &&
      user?.tenant.id === incomingUser?.tenant.id
    ) {
      return;
    }
    set({ user: incomingUser, isInitialized: true });
  },

  clearUser: () => {
    set({ user: null, isInitialized: false });
  },

  // 便利メソッド
  getTenantName: () => {
    const { user } = get();
    return user?.tenant.name || 'テナント未設定';
  },
}));

// 便利なフック
export const useUserInfo = () => {
  const { user, isInitialized } = useUserStore();
  return {
    user,
    isInitialized,
    displayName: user?.name || user?.email.split('@')[0] || 'ユーザー',
    email: user?.email,
    role: user?.role,
    tenantName: user?.tenant.name,
  };
};

// ローダーデータを使ってstoreを初期化するフック（useEffectを使わない宣言的アプローチ）
export const useLoaderDataSync = (loaderData: Record<string, unknown> | undefined) => {
  // loaderData: { user?: AuthenticatedUser } | {}
  if (loaderData && 'user' in loaderData) {
    const data = loaderData as { user?: AuthenticatedUser | null };
    if (typeof data.user !== 'undefined') {
      useUserStore.getState().initializeUser(data.user ?? null);
      return;
    }
  }
  const { isInitialized } = useUserStore.getState();
  if (isInitialized) {
    useUserStore.getState().clearUser();
  }
};
