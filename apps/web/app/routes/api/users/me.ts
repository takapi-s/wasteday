import { getAuthenticatedUser } from "../../../lib/auth.server";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";

export async function loader(args: LoaderFunctionArgs) {
  try {
    const user = await getAuthenticatedUser(args);
    
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    return Response.json({
      id: user.id,
      publicId: user.publicId,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenant.id,
      tenantName: user.tenant.name,
    });
  } catch (error) {
    console.error("Get user error:", error);
    return Response.json({ error: "Failed to get user information" }, { status: 500 });
  }
}

export async function action(args: ActionFunctionArgs) {
  try {
    const user = await getAuthenticatedUser(args);
    
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await args.request.json() as { name?: string; email?: string };
    const { name, email } = body;
    const { db } = await import("@packages/db/client.server");
    const { users } = await import("@packages/db/schemas");
    const { eq } = await import("drizzle-orm");

    const dbClient = db({ DATABASE_URL: args.context.cloudflare.env.HYPERDRIVE.connectionString });
    
    const updatedUser = await dbClient
      .update(users)
      .set({
        name: name || user.name,
        email: email || user.email,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))
      .returning();

    return Response.json({
      success: true,
      user: {
        id: updatedUser[0].id,
        publicId: updatedUser[0].publicId,
        email: updatedUser[0].email,
        name: updatedUser[0].name,
        role: updatedUser[0].role,
        tenantId: updatedUser[0].tenantId,
        isActive: updatedUser[0].isActive,
      }
    });
  } catch (error) {
    console.error("Update user error:", error);
    return Response.json({ error: "Failed to update user information" }, { status: 500 });
  }
}
