import { createSupabaseServiceClient } from "../../../lib/supabase.server";
import { db } from "@packages/db/client.server";
import { users, tenants } from "@packages/db/schemas";
import { eq } from "drizzle-orm";
import type { ActionFunctionArgs } from "react-router";

export async function action({ request, context }: ActionFunctionArgs) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password || !name) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    console.log("Registration attempt:", { email, name });

    // Supabase Authでユーザー作成
    const supabase = createSupabaseServiceClient({ request, context });
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name }
      }
    });

    if (error) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    if (!data.user) {
      return Response.json({ error: "Failed to create user" }, { status: 500 });
    }

    // ユーザー名をテナント名として新しいテナントを作成
    const dbClient = db({ DATABASE_URL: context.cloudflare.env.HYPERDRIVE.connectionString });
    
    const newTenant = await dbClient
      .insert(tenants)
      .values({
        name: `${name}'s Tenant`,
        isActive: true,
      })
      .returning();
    
    const tenantId = newTenant[0].id;

    // データベースにユーザー情報を保存
    const newUser = await dbClient
      .insert(users)
      .values({
        tenantId,
        email,
        authUserId: data.user.id,
        name,
        role: "member",
        isActive: true,
      })
      .returning();

    return Response.json({
      success: true,
      user: {
        id: newUser[0].id,
        publicId: newUser[0].publicId,
        email: newUser[0].email,
        name: newUser[0].name,
        role: newUser[0].role,
        tenantId: newUser[0].tenantId,
      }
    });
  } catch (error) {
    console.error("Registration error:", error);
    console.error("Error details:", error instanceof Error ? error.message : error);
    return Response.json({ 
      error: "Registration failed",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
