import { createSupabaseServerClient } from "../../lib/supabase.server";
import { db } from "@packages/db/client.server";
import { users, tenants } from "@packages/db/schemas";
import { eq } from "drizzle-orm";
import type { Route } from "./+types/route";

export async function action({ request, context }: Route.ActionArgs) {
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const name = formData.get("name") as string;
  const authUserId = formData.get("authUserId") as string;

  if (!email || !name || !authUserId) {
    return { error: "Missing required fields" };
  }

  try {
    const dbClient = db({ DATABASE_URL: context.cloudflare.env.HYPERDRIVE.connectionString });

    // デフォルトテナントを取得（最初のテナントまたは新規作成）
    const defaultTenants = await dbClient
      .select()
      .from(tenants)
      .limit(1);
    
    let tenantId: number;
    if (defaultTenants.length === 0) {
      // デフォルトテナントを作成
      const newTenant = await dbClient
        .insert(tenants)
        .values({
          name: "Default Tenant",
          isActive: true,
        })
        .returning();
      tenantId = newTenant[0].id;
    } else {
      tenantId = defaultTenants[0].id;
    }

    // ユーザーをデータベースに保存
    const newUser = await dbClient
      .insert(users)
      .values({
        tenantId,
        email,
        authUserId,
        name,
        role: "member", // デフォルトロール
        isActive: true,
      })
      .returning();

    return { success: true, user: newUser[0] };
  } catch (error) {
    console.error("Database error:", error);
    return { error: "Failed to create user in database" };
  }
}
