import {
  index,
  integer,
  jsonb,
  pgPolicy,
  pgTable,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { authenticatedRole, serviceRole } from "drizzle-orm/supabase";

import { tenants } from "./tenants";
import { users } from "./users";

export const userSettings = pgTable(
  "user_settings",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    tenantId: integer("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade", onUpdate: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
    key: varchar("key", { length: 100 }).notNull(),
    value: jsonb("value").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => sql`now()`),
  },
  (table) => ({
    tenantUserIdx: index("user_settings_tenant_user_idx").on(
      table.tenantId,
      table.userId
    ),
    keyIdx: index("user_settings_key_idx").on(table.key),
    tenantUserKeyUid: unique("user_settings_tenant_user_key_uid").on(
      table.tenantId,
      table.userId,
      table.key
    ),
    
    // RLS ポリシー
    selectOwnPolicy: pgPolicy("user_settings_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = ${table.userId} 
        AND users.auth_user_id = auth.uid()
      )`,
    }),
    
    updateOwnPolicy: pgPolicy("user_settings_update_own", {
      for: "update",
      to: authenticatedRole,
      using: sql`EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = ${table.userId} 
        AND users.auth_user_id = auth.uid()
      )`,
      withCheck: sql`EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = ${table.userId} 
        AND users.auth_user_id = auth.uid()
      )`,
    }),
    
    insertOwnPolicy: pgPolicy("user_settings_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = ${table.userId} 
        AND users.auth_user_id = auth.uid()
      )`,
    }),
    
    deleteOwnPolicy: pgPolicy("user_settings_delete_own", {
      for: "delete",
      to: authenticatedRole,
      using: sql`EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = ${table.userId} 
        AND users.auth_user_id = auth.uid()
      )`,
    }),
    
    serviceRolePolicy: pgPolicy("user_settings_service_role_all", {
      for: "all",
      to: serviceRole,
      using: sql`true`,
      withCheck: sql`true`,
    }),
  })
);
