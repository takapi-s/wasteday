import { createServerClient } from "@supabase/ssr";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";

export function createSupabaseServerClient(args: LoaderFunctionArgs | ActionFunctionArgs) {
  const { request, context } = args;
  
  return createServerClient(
    context.cloudflare.env.VITE_SUPABASE_URL,
    context.cloudflare.env.VITE_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          const cookies = request.headers.get("cookie");
          if (!cookies) {
            console.log("No cookies found");
            return undefined;
          }
          
          // SupabaseのCookie名を検索（sb-<project-ref>-auth-token形式）
          const cookie = cookies.split(";").find(c => c.trim().startsWith(`${name}=`));
          const value = cookie ? cookie.split("=")[1] : undefined;
          console.log(`Cookie get ${name}:`, value ? "found" : "not found");
          return value;
        },
        set(name: string, value: string, options: any) {
          console.log(`Cookie set ${name}:`, value ? "set" : "not set");
          // Cloudflare Workersでは直接Cookieを設定できないため、
          // レスポンスヘッダーで設定する必要があります
          // この実装ではCookieの設定はクライアントサイドで行います
        },
        remove(name: string, options: any) {
          console.log(`Cookie remove ${name}`);
          // Cloudflare Workersでは直接Cookieを削除できないため、
          // レスポンスヘッダーで削除する必要があります
          // この実装ではCookieの削除はクライアントサイドで行います
        },
      },
    }
  );
}

export function createSupabaseServiceClient(args: LoaderFunctionArgs | ActionFunctionArgs) {
  const { context } = args;
  
  return createServerClient(
    context.cloudflare.env.VITE_SUPABASE_URL,
    context.cloudflare.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      cookies: {
        get() { return undefined; },
        set() {},
        remove() {},
      },
    }
  );
}
