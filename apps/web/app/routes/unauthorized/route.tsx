import { useUserInfo } from "../../stores/userStore";
import { AlertTriangle } from 'lucide-react';
import { Form } from "react-router";
import type { Route } from "./+types/route";

export const meta: Route.MetaFunction = ({ data }) => {
  return [
    { title: "アクセス権限がありません" },
  ];
};

export default function UnauthorizedPage() {
  const { user } = useUserInfo();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-4">
            <AlertTriangle className="h-8 w-8 text-yellow-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            アクセス権限がありません
          </h1>

          <p className="text-gray-600 mb-6">
            このシステムを利用するには管理者権限が必要です。
            {user?.emailAddresses[0]?.emailAddress && (
              <>
                <br />
                <span className="text-sm text-gray-500 mt-2 block">
                  アカウント: {user.emailAddresses[0].emailAddress}
                </span>
              </>
            )}
          </p>

          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-2">
                管理者権限の取得について
              </h3>
              <p className="text-sm text-blue-700">
                システムの管理者権限が必要です。システム管理者に連絡して、あなたのアカウントに管理者権限を付与してもらってください。
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-amber-900 mb-2">
                お問い合わせ手順
              </h3>
              <div className="text-sm text-amber-700 space-y-1">
                <p>1. システム管理者に連絡</p>
                <p>2. あなたのメールアドレスを伝える</p>
                <p>3. 権限付与後、このページを再読み込み</p>
              </div>
            </div>

            <div className="flex flex-col space-y-3 pt-4">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                権限確認を再試行
              </button>

              <Form method="post" action="/logout">
                <button 
                  type="submit"
                  className="w-full bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
                >
                  ログアウト
                </button>
              </Form>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              権限付与後もこのページが表示される場合は、ブラウザを再読み込みしてください。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
