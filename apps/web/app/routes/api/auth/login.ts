import { createSupabaseServiceClient } from "../../../lib/supabase.server";
import { db } from "@packages/db/client.server";
import { users } from "@packages/db/schemas";
import { eq } from "drizzle-orm";
import type { ActionFunctionArgs } from "react-router";

export async function action({ request, context }: ActionFunctionArgs) {
  console.log("Login API called");
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return Response.json({ error: "Missing email or password" }, { status: 400 });
    }

    console.log("Attempting login for:", email);

    // Supabase Authでログイン
    const supabase = createSupabaseServiceClient({ request, context });
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Supabase Auth error:", error.message);
      return Response.json({ error: error.message }, { status: 401 });
    }

    if (!data.user || !data.session) {
      return Response.json({ error: "Login failed" }, { status: 401 });
    }

    // データベースからユーザー情報を取得
    const dbClient = db({ DATABASE_URL: context.cloudflare.env.HYPERDRIVE.connectionString });
    const dbUsers = await dbClient
      .select()
      .from(users)
      .where(eq(users.authUserId, data.user.id))
      .limit(1);
    
    const dbUser = dbUsers[0];
    
    if (!dbUser || !dbUser.isActive) {
      return Response.json({ error: "User not found or inactive" }, { status: 401 });
    }

    console.log("Login successful:", { email, userId: dbUser.id });

    // セッションを設定するためのCookieを返す
    const response = Response.json({
      success: true,
      user: {
        id: dbUser.id,
        publicId: dbUser.publicId,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
        tenantId: dbUser.tenantId,
      },
      session: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at,
      }
    });

    // Set-Cookieヘッダーを追加
    response.headers.set(
      'Set-Cookie',
      `sb-access-token=${data.session.access_token}; Path=/; Max-Age=${data.session.expires_in}; HttpOnly; SameSite=Lax`
    );

    return response;
  } catch (error) {
    console.error("Login error:", error);
    console.error("Error details:", error instanceof Error ? error.message : error);
    return Response.json({ 
      error: "Login failed",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
