import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  redirect,
  useLocation,
} from "react-router";
import { ToastContainer } from "./components/Toast";
import { useLoaderDataSync } from "./stores/userStore";
import { getAuthenticatedUser } from "./lib/auth.server";
import { createSupabaseServerClient } from "./lib/supabase.server";

import type { Route } from "./+types/root";
import "./app.css";


export async function loader(args: Route.LoaderArgs) {
  const { request } = args;
  const url = new URL(request.url);
  
  // APIルートは認証不要
  if (url.pathname.startsWith("/api/")) {
    return {};
  }

  // Supabase Authでユーザー認証をチェック
  const supabase = createSupabaseServerClient(args);
  const { data: { user }, error } = await supabase.auth.getUser();
  
  console.log("Auth check:", { 
    pathname: url.pathname, 
    hasUser: !!user, 
    hasError: !!error,
    error: error?.message 
  });

  // ログインページでの処理
  if (url.pathname === "/login") {
    // 既にログインしている場合はダッシュボードにリダイレクト
    if (user && !error) {
      throw redirect("/");
    }
    return {};
  }

  // サインアップページでの処理
  if (url.pathname === "/signup") {
    // 既にログインしている場合はダッシュボードにリダイレクト
    if (user && !error) {
      throw redirect("/");
    }
    return {};
  }

  // 未認証ページは認証不要でアクセス可能
  if (url.pathname === "/unauthorized") {
    return {};
  }

  // その他のページでは未ログインの場合はログインページにリダイレクト
  if (!user || error) {
    throw redirect("/login");
  }

  // ログイン済みの場合、ユーザー情報を取得
  const authenticatedUser = await getAuthenticatedUser(args);

  return {
    user: authenticatedUser,
  };
}

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App({ loaderData }: Route.ComponentProps) {
  // カスタムフックでローダーデータをstoreに同期
  useLoaderDataSync(loaderData);

  return (
    <>
      <ConditionalLayout>
        <Outlet />
      </ConditionalLayout>
      <ToastContainer />
    </>
  );
}

function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';
  const isUnauthorizedPage = location.pathname === '/unauthorized';

  // ログインページと未認証ページではレイアウトを適用しない
  if (isLoginPage || isUnauthorizedPage) {
    return <>{children}</>;
  }

  return <>{children}</>;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
