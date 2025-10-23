import { createRequestHandler } from "react-router";

declare module "react-router" {
  export interface AppLoadContext {
    cloudflare: {
      env: Env;
      ctx: ExecutionContext;
    };
  }
}

// Basic認証のミドルウェア関数
function basicAuth(request: Request, env: Env): Response | null {
  // 環境変数から認証情報を取得
  const username = "admin";
  const password = "Sw87H5t3Em0lffA";

  // 認証情報が設定されていない場合は認証をスキップ
  if (!username || !password) {
    return null;
  }

  const authHeader = request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return new Response("認証が必要です", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Company Search"',
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }

  // Basic認証のヘッダーをデコード
  const encodedCredentials = authHeader.substring(6);
  const decodedCredentials = atob(encodedCredentials);
  const [providedUsername, providedPassword] = decodedCredentials.split(":");

  // 認証情報を検証
  if (providedUsername !== username || providedPassword !== password) {
    return new Response("認証に失敗しました", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Company Search"',
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }

  // 認証成功
  return null;
}

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE
);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Chrome DevToolsのリクエストをフィルタリング
    if (url.pathname.startsWith("/.well-known/")) {
      return new Response("Not Found", { status: 404 });
    }

    // Basic認証をチェック
    // const authResponse = basicAuth(request, env);
    // if (authResponse) {
    //   return authResponse;
    // }

    // 認証が成功した場合、通常のリクエスト処理を続行
    return requestHandler(request, {
      cloudflare: { env, ctx },
    });
  },
} satisfies ExportedHandler<Env>;
