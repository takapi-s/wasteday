import { useUserInfo } from "../../stores/userStore";
import type { Route } from "./+types/route";
import { getAuthenticatedUser } from "../../lib/auth.server";
import { db } from "@packages/db/client.server";
import { eq } from "drizzle-orm";
import { users } from "@packages/db/schemas";
import { useNavigate } from "react-router";

export async function loader(args: Route.LoaderArgs) {
  const user = await getAuthenticatedUser(args);
  
  if (!user) {
    throw new Response("Unauthorized", { status: 401 });
  }

  // 管理者のみアクセス可能
  if (user.role !== 'admin') {
    throw new Response("Forbidden - Admin access required", { status: 403 });
  }

  const dbClient = db({ DATABASE_URL: args.context.cloudflare.env.HYPERDRIVE.connectionString });
  
  // テナント内の全てのユーザーを取得
  const tenantUsers = await dbClient
    .select({
      id: users.id,
      publicId: users.publicId,
      email: users.email,
      name: users.name,
      role: users.role,
      isActive: users.isActive,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.tenantId, user.tenant.id))
    .orderBy(users.name);

  return { user, tenantUsers };
}

export default function TenantPage({ loaderData }: Route.ComponentProps) {
  const { displayName, email, tenantName, role } = useUserInfo();
  const navigate = useNavigate();
  
  const { tenantUsers = [] } = loaderData || {};

  // ロール別のラベルマッピング
  const roleLabels: Record<string, string> = {
    admin: '管理者',
    member: 'メンバー',
    viewer: '閲覧者',
  };

  // ロール別のバッジスタイル
  const roleStyles: Record<string, string> = {
    admin: 'bg-red-100 text-red-800',
    member: 'bg-blue-100 text-blue-800',
    viewer: 'bg-gray-100 text-gray-800',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">テナント管理</h1>
            <p className="text-gray-600 mt-2">
              {tenantName} - {displayName} ({email})
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              ホームに戻る
            </button>
            <form method="post" action="/logout">
              <button
                type="submit"
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                ログアウト
              </button>
            </form>
          </div>
        </div>

        {/* ユーザー統計 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-1">総ユーザー数</h3>
            <p className="text-2xl font-bold text-gray-900">{tenantUsers.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-1">管理者</h3>
            <p className="text-2xl font-bold text-gray-900">
              {tenantUsers.filter(u => u.role === 'admin').length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-1">メンバー</h3>
            <p className="text-2xl font-bold text-gray-900">
              {tenantUsers.filter(u => u.role === 'member').length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-1">閲覧者</h3>
            <p className="text-2xl font-bold text-gray-900">
              {tenantUsers.filter(u => u.role === 'viewer').length}
            </p>
          </div>
        </div>

        {/* ユーザー一覧 */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">ユーザー一覧</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    名前
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    メールアドレス
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ロール
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状態
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    最終ログイン
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tenantUsers.length > 0 ? (
                  tenantUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-600 font-medium text-sm">
                              {user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleStyles[user.role] || roleStyles.viewer}`}>
                          {roleLabels[user.role] || user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.isActive ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            アクティブ
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            非アクティブ
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.lastLoginAt
                          ? new Date(user.lastLoginAt).toLocaleString('ja-JP')
                          : '未ログイン'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <p className="text-gray-500">ユーザーが登録されていません</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ロール説明 */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">ロールの説明</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 mr-2">
                  管理者
                </span>
              </h3>
              <p className="text-sm text-gray-600">
                テナント内の全てのユーザーを管理できます。ユーザーの追加・削除・ロール変更が可能です。
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                  メンバー
                </span>
              </h3>
              <p className="text-sm text-gray-600">
                通常のユーザーです。自分のアクティビティを確認し、基本的な機能を使用できます。
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 mr-2">
                  閲覧者
                </span>
              </h3>
              <p className="text-sm text-gray-600">
                データの閲覧のみが可能です。設定の変更やデータの編集はできません。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
