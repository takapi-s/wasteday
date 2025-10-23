import { useState } from "react";
import { Form, useActionData, useNavigation } from "react-router";
import { useSignIn } from "@clerk/react-router";
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
    { title: "ログイン" },
  ];
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const { signIn, setActive } = useSignIn();
  const navigation = useNavigation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 基本的なバリデーション
    if (!email.trim()) {
      setError("メールアドレスを入力してください");
      return;
    }

    if (!password.trim()) {
      setError("パスワードを入力してください");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("有効なメールアドレスを入力してください");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      if (!signIn) {
        throw new Error("サインイン機能が利用できません");
      }

      // Clerkでメール/パスワードログインを実行
      const result = await signIn.create({
        identifier: email.trim(),
        password: password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        // リダイレクトはroot.tsxのloaderで処理される
        window.location.href = "/";
      } else {
        // 追加の認証ステップが必要な場合
        console.log("追加の認証が必要:", result);
        setError("ログインを完了するために追加の手順が必要です");
      }
    } catch (err: any) {
      console.error("ログインエラー:", err);

      // Clerkのエラーメッセージを日本語に変換
      let errorMessage = "ログインに失敗しました";

      if (err.errors && err.errors[0]) {
        const clerkError = err.errors[0];
        if (clerkError.code === "form_identifier_not_found") {
          errorMessage = "このメールアドレスは登録されていません";
        } else if (clerkError.code === "form_password_incorrect") {
          errorMessage = "パスワードが正しくありません";
        } else if (clerkError.code === "form_identifier_exists") {
          errorMessage = "このメールアドレスは既に使用されています";
        } else {
          errorMessage = clerkError.message || errorMessage;
        }
      }

      setError(errorMessage);
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
            ログイン
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            アクセスするにはログインが必要です
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
                メールアドレス
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
                パスワード
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
                placeholder="パスワードを入力"
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
                  ログイン中...
                </div>
              ) : (
                "ログイン"
              )}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              アカウントをお持ちでない場合は、管理者にお問い合わせください
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
