import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  tenants,
  users,
} from "../schemas";
import { USER_ROLE_VALUES, type UserRole } from "../schemas/users";
import dotenv from "dotenv";

dotenv.config();

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const sql = postgres(connectionString, { max: 1 });
const db = drizzle(sql);

type SampleTenant = {
  name: string;
  users?: Array<{
    email: string;
    name: string;
    role?: UserRole;
    clerkUserId?: string;
  }>;
};

const [ROLE_ADMIN, ROLE_MEMBER, ROLE_VIEWER] = USER_ROLE_VALUES;

const SAMPLE_TENANTS: SampleTenant[] = [
  {
    name: "Demo 企業A",
    users: [
      {
        email: "admin+a@example.com",
        name: "A 管理者",
        role: ROLE_ADMIN,
        clerkUserId: "user_33EYp4zrveSAcI4DlY0cFfeYAn8",
      },
      {
        email: "member+a@example.com",
        name: "A メンバー",
        role: ROLE_MEMBER,
        clerkUserId: "clerk_demo_a_member",
      },
    ],
  },
  {
    name: "Demo 企業B",
    users: [
      {
        email: "admin+b@example.com",
        name: "B 管理者",
        role: ROLE_ADMIN,
        clerkUserId: "user_33F1uWRzMNhLlecwuB7qsvonFI5",
      },
      {
        email: "viewer+b@example.com",
        name: "B 閲覧者",
        role: ROLE_VIEWER,
        clerkUserId: "clerk_demo_b_viewer",
      },
    ],
  },
];

async function ensureTenant(tenantName: string) {
  const existing = await db
    .select()
    .from(tenants)
    .where(eq(tenants.name, tenantName))
    .limit(1);

  if (existing.length > 0) return existing[0];

  const inserted = await db.insert(tenants).values({ name: tenantName }).returning();
  return inserted[0];
}

async function ensureUser(
  tenantId: number,
  email: string,
  name: string,
  role: UserRole = ROLE_MEMBER,
  clerkUserId?: string
) {
  const existing = await db
    .select()
    .from(users)
    .where(and(eq(users.tenantId, tenantId), eq(users.email, email)))
    .limit(1);

  if (existing.length > 0) return existing[0];

  const inserted = await db
    .insert(users)
    .values({ tenantId, email, name, role, clerkUserId: clerkUserId ?? email })
    .returning();
  return inserted[0];
}

async function seed() {
  console.log("サンプルテナントとユーザーのシードを開始します...");

  for (const t of SAMPLE_TENANTS) {
    const tenant = await ensureTenant(t.name);
    console.log(`tenant: ${tenant.name} (#${tenant.id})`);

    for (const u of t.users ?? []) {
      const user = await ensureUser(tenant.id, u.email, u.name, u.role ?? ROLE_MEMBER, u.clerkUserId);
      console.log(`  user: ${user.email} (${user.role})`);
    }
  }

  console.log("サンプルテナントのシードが完了しました");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seed()
    .then(async () => {
      await sql.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error("シード中にエラーが発生しました", err);
      await sql.end();
      process.exit(1);
    });
}

export { seed };


