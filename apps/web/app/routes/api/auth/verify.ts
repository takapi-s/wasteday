import { createSupabaseServiceClient } from "../../../lib/supabase.server";
import { db } from "@packages/db/client.server";
import { users } from "@packages/db/schemas";
import { eq } from "drizzle-orm";
import type { LoaderFunctionArgs } from "react-router";

export async function loader({ request, context }: LoaderFunctionArgs) {
  try {
    const authHeader = request.headers.get("Authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return Response.json({ error: "Missing authorization header" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const supabase = createSupabaseServiceClient({ request, context });
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return Response.json({ error: "Invalid token" }, { status: 401 });
    }

    // データベースからユーザー情報を取得
    const dbClient = db({ DATABASE_URL: context.cloudflare.env.HYPERDRIVE.connectionString });
    const dbUsers = await dbClient
      .select()
      .from(users)
      .where(eq(users.authUserId, user.id))
      .limit(1);
    
    const dbUser = dbUsers[0];
    
    if (!dbUser || !dbUser.isActive) {
      return Response.json({ error: "User not found or inactive" }, { status: 401 });
    }

    return Response.json({
      valid: true,
      user: {
        id: dbUser.id,
        publicId: dbUser.publicId,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
        tenantId: dbUser.tenantId,
      }
    });
  } catch (error) {
    console.error("Token verification error:", error);
    return Response.json({ error: "Token verification failed" }, { status: 500 });
  }
}
