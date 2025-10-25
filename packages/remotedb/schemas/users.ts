import {
  boolean,
  index,
  integer,
  pgEnum,
  pgPolicy,
  pgTable,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { authenticatedRole, serviceRole } from "drizzle-orm/supabase";

import { tenants } from "./tenants";

export const USER_ROLE_VALUES = ["admin", "member", "viewer"] as const;
export type UserRole = (typeof USER_ROLE_VALUES)[number];
export const USER_ROLE_LABEL: Record<UserRole, string> = {
  admin: "管理者",
  member: "メンバー",
  viewer: "閲覧者",
};
export const userRoleEnum = pgEnum("user_role", USER_ROLE_VALUES);

export const users = pgTable(
  "users",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    publicId: uuid("public_id").notNull().defaultRandom(),
    tenantId: integer("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade", onUpdate: "cascade" }),
    email: varchar("email", { length: 255 }).notNull(),
    authUserId: uuid("auth_user_id").notNull(), // ClerkからSupabase Authへ変更
    name: varchar("name", { length: 255 }).notNull(),
    role: userRoleEnum("role").notNull().default("member"),
    isActive: boolean("is_active").notNull().default(true),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => sql`now()`),
  },
  (table) => ({
    tenantIdIdx: index("users_tenant_id_idx").on(table.tenantId),
    emailIdx: index("users_email_idx").on(table.email),
    roleIdx: index("users_role_idx").on(table.role),
    isActiveIdx: index("users_is_active_idx").on(table.isActive),
    publicIdUidIdx: unique("users_public_id_uidx").on(table.publicId),
    authUserIdUidIdx: uniqueIndex("users_auth_user_id_uidx").on(
      table.authUserId
    ),
    emailUidIdx: uniqueIndex("users_email_uidx").on(table.email),
    
    // RLS ポリシー
    selectOwnPolicy: pgPolicy("users_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`${table.authUserId} = auth.uid()`,
    }),
    
    updateOwnPolicy: pgPolicy("users_update_own", {
      for: "update",
      to: authenticatedRole,
      using: sql`${table.authUserId} = auth.uid()`,
      withCheck: sql`${table.authUserId} = auth.uid()`,
    }),
    
    // 管理者はテナント内の全ユーザーを閲覧可能
    adminSelectPolicy: pgPolicy("users_admin_select_tenant", {
      for: "select",
      to: authenticatedRole,
      using: sql`EXISTS (
        SELECT 1 FROM users admin_users 
        WHERE admin_users.auth_user_id = auth.uid() 
        AND admin_users.role = 'admin' 
        AND admin_users.tenant_id = ${table.tenantId}
      )`,
    }),
    
    serviceRolePolicy: pgPolicy("users_service_role_all", {
      for: "all",
      to: serviceRole,
      using: sql`true`,
      withCheck: sql`true`,
    }),
  })
);

