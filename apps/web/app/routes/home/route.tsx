import { useUserInfo } from "../../stores/userStore";
import type { Route } from "./+types/route";
import { getAuthenticatedUser } from "../../lib/auth.server";
import { db } from "@packages/db/client.server";
import { eq, desc, and, gte } from "drizzle-orm";
import { browsingSessions } from "@packages/db/schemas";

export async function loader(args: Route.LoaderArgs) {
  const user = await getAuthenticatedUser(args);
  
  if (!user) {
    return null;
  }

  // 過去7日間のアクティビティデータを取得
  const since = new Date();
  since.setDate(since.getDate() - 7);

  const dbClient = db({ DATABASE_URL: args.context.cloudflare.env.HYPERDRIVE.connectionString });
  
  const sessions = await dbClient
    .select()
    .from(browsingSessions)
    .where(
      and(
        eq(browsingSessions.userId, user.id),
        eq(browsingSessions.tenantId, user.tenant.id),
        gte(browsingSessions.startTime, since)
      )
    )
    .orderBy(desc(browsingSessions.startTime))
    .limit(50);

  return { user, sessions };
}

export default function HomePage({ loaderData }: Route.ComponentProps) {
  const { displayName, email, tenantName, role } = useUserInfo();
  
  const { sessions = [] } = loaderData || {};

  // 統計データを計算
  const totalTime = sessions.reduce((sum: number, s: any) => sum + (s.durationSeconds || 0), 0);
  const domainCount = new Set(sessions.map((s: any) => s.domain)).size;
  const sessionCount = sessions.length;

  // ドメインごとの使用時間集計
  const domainStats = sessions.reduce((acc: Map<string, number>, session: any) => {
    const duration = session.durationSeconds || 0;
    acc.set(session.domain, (acc.get(session.domain) || 0) + duration);
    return acc;
  }, new Map());

  const topDomains = Array.from(domainStats.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([domain, seconds]) => ({ domain, seconds }));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome, {displayName}!
            </h1>
            <p className="text-gray-600 mt-2">
              {email} • {tenantName}
            </p>
          </div>
          <form method="post" action="/logout">
            <button
              type="submit"
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Logout
            </button>
          </form>
        </div>

        {/* 統計カード */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">総使用時間</h3>
            <p className="text-3xl font-bold text-gray-900">
              {Math.floor(totalTime / 3600)}時間{Math.floor((totalTime % 3600) / 60)}分
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">アクセスしたサイト数</h3>
            <p className="text-3xl font-bold text-gray-900">{domainCount}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">セッション数</h3>
            <p className="text-3xl font-bold text-gray-900">{sessionCount}</p>
          </div>
        </div>

        {/* トップドメイン */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              よくアクセスしているサイト
            </h2>
            {topDomains.length > 0 ? (
              <div className="space-y-3">
                {topDomains.map((item, index) => (
                  <div key={item.domain} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mr-3">
                        {index + 1}
                      </span>
                      <span className="text-gray-900 font-medium">{item.domain}</span>
                    </div>
                    <span className="text-gray-600 text-sm">
                      {Math.floor(item.seconds / 60)}分
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                アクティビティデータがありません
              </p>
            )}
          </div>

          {/* ユーザー情報カード */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              アカウント情報
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="text-base text-gray-900 mt-1">{email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">テナント</p>
                <p className="text-base text-gray-900 mt-1">{tenantName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">ロール</p>
                <p className="text-base text-gray-900 mt-1">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {role}
                  </span>
                </p>
              </div>
              {role === 'admin' && (
                <a
                  href="/tenant"
                  className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                >
                  テナント管理画面へ
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
