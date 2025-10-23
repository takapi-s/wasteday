import { getAuth } from "@clerk/react-router/ssr.server";
import { createClerkClient } from "@clerk/backend";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { db } from "@packages/db/client.server";
import { eq } from "drizzle-orm";
import { users, tenants } from "@packages/db/schemas";

export interface AuthenticatedUser {
  id: number; // DB user id
  publicId: string; // DB public_id
  clerkUserId: string; // Clerk user id
  email: string;
  name: string;
  role: string;
  imageUrl?: string;
  tenant: {
    id: number;
    publicId: string;
    name: string;
  };
}

type AuthArgs = LoaderFunctionArgs | ActionFunctionArgs;

/**
 * React Router v7のloaderArgsからアプリ用の認証済みユーザー情報を取得（テナント1:1）
 */
export async function getAuthenticatedUser(
  args: AuthArgs
): Promise<AuthenticatedUser | null> {
  try {
    const { userId } = await getAuth(args);
    if (!userId) {
      return null;
    }

    const dbClient = db({ DATABASE_URL: args.context.cloudflare.env.HYPERDRIVE.connectionString });

    // DBのユーザーを取得（Activeのみ）
    const dbUsers = await dbClient
      .select()
      .from(users)
      .where(eq(users.clerkUserId, userId))
      .limit(1);
    const dbUser = dbUsers[0];

    if (!dbUser || dbUser.isActive === false) {
      return null;
    }

    // テナントを取得
    const dbTenants = await dbClient
      .select()
      .from(tenants)
      .where(eq(tenants.id, dbUser.tenantId))
      .limit(1);
    const dbTenant = dbTenants[0];
    if (!dbTenant) {
      return null;
    }

    // 表示用にClerkの画像URL等を取得（任意）
    let imageUrl: string | undefined;
    try {
      const clerkClient = createClerkClient({
        secretKey: args.context.cloudflare.env.CLERK_SECRET_KEY,
      });
      const clerkUser = await clerkClient.users.getUser(userId);
      imageUrl = clerkUser?.imageUrl;
    } catch {
      // 画像URL取得に失敗しても致命的ではないため無視
    }

    // ログイン時刻を更新（エラーは握りつぶす）
    try {
      await dbClient
        .update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, dbUser.id));
    } catch {}

    return {
      id: dbUser.id,
      publicId: dbUser.publicId,
      clerkUserId: dbUser.clerkUserId,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role,
      imageUrl,
      tenant: {
        id: dbTenant.id,
        publicId: dbTenant.publicId,
        name: dbTenant.name,
      },
    };
  } catch (error) {
    console.error("認証エラー:", error);
    return null;
  }
}

/**
 * 簡単な認証チェック用のヘルパー関数（ClerkのユーザーID）
 */
export async function getUserId(
  args: AuthArgs
): Promise<string | null> {
  try {
    const { userId } = await getAuth(args);
    return userId ?? null;
  } catch (error) {
    console.error("ユーザーID取得エラー:", error);
    return null;
  }
}

/**
 * サインイン必須ヘルパー
 */
export async function requireAuth(
  args: AuthArgs
): Promise<string> {
  const userId = await getUserId(args);
  if (!userId) {
    throw new Response("認証が必要です", {
      status: 401,
      statusText: "Unauthorized",
    });
  }
  return userId;
}
