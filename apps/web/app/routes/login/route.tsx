import { useState } from "react";
import { Form, useActionData, useNavigation, Link } from "react-router";
import { Lock, XCircle, Loader2 } from 'lucide-react';
import type { Route } from "./+types/route";

interface ActionData {
  error?: string;
  success?: boolean;
}

export async function action({ request }: any) {
  // フォームデータの処理はクライアントサイドで行う
  return { success: true };
}

export const meta: Route.MetaFunction = ({ data }) => {
  return [
    { title: "Login" },
  ];
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const navigation = useNavigation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    if (!password.trim()) {
      setError("Please enter your password");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // APIエンドポイントを使用してログイン
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password: password,
        })
      });

      const result = await response.json() as {
        success?: boolean;
        session?: {
          accessToken: string;
          refreshToken: string;
          expiresAt: number;
        };
        user?: {
          id: number;
          publicId: string;
          email: string;
          name: string;
          role: string;
          tenantId: number;
        };
        error?: string;
      };

      if (!response.ok) {
        throw new Error(result.error || 'Login failed');
      }

      if (result.success && result.session) {
        console.log("Login successful, setting session:", result.session);
        
        // セッション情報をlocalStorageに保存
        localStorage.setItem('supabase_session', JSON.stringify(result.session));
        
        // Supabase SSRが期待するCookie形式を設定
        // Supabaseは sb-<project-id>-auth-token という形式のCookieを期待
        const maxAge = result.session.expiresAt 
          ? Math.floor((result.session.expiresAt * 1000 - Date.now()) / 1000)
          : 3600;
        
        // localhostの場合のCookie設定
        const domain = window.location.hostname === 'localhost' ? '' : `; domain=${window.location.hostname}`;
        
        // Supabaseが期待する形式のセッションJSONを設定
        const sessionData = {
          access_token: result.session.accessToken,
          refresh_token: result.session.refreshToken,
          expires_at: result.session.expiresAt,
          expires_in: maxAge,
          token_type: 'bearer',
          user: result.user
        };
        
        // Supabaseの認証Cookieを設定（プロジェクト参照IDを含む）
        // ローカル開発環境では sb-127-auth-token 形式
        const cookieValue = JSON.stringify(sessionData);
        const cookieString = `sb-127-auth-token=${cookieValue}; path=/; max-age=${maxAge}; SameSite=Lax${domain}`;
        
        console.log("Setting cookie:", cookieString.substring(0, 100) + "...");
        document.cookie = cookieString;
        
        console.log("Cookies after setting:", document.cookie);
        console.log("Cookie set, redirecting to /");
        
        // ホームページにリダイレクト
        window.location.href = "/";
      }
    } catch (err: any) {
      console.error("Login error:", err);

      // Use error message from API
      setError(err.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <div>
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center">
              <Lock className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Login
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Please log in to access your account
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <XCircle className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="your@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Enter your password"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading || !email || !password}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
                  Signing in...
                </div>
              ) : (
                "Sign In"
              )}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="font-medium text-indigo-600 hover:text-indigo-500"
              >
                Create Account
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
