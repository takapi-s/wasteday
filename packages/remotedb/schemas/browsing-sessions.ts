import {
  index,
  integer,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { authenticatedRole, serviceRole } from "drizzle-orm/supabase";

import { tenants } from "./tenants";
import { users } from "./users";
import { devices } from "./devices";
import { wasteCategories } from "./waste-categories";

export const browsingSessions = pgTable(
  "browsing_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade", onUpdate: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
    deviceId: integer("device_id")
      .references(() => devices.id, { onDelete: "set null", onUpdate: "cascade" }),
    domain: varchar("domain", { length: 255 }).notNull(),
    url: text("url").notNull(),
    title: text("title"),
    startTime: timestamp("start_time", { withTimezone: true }).notNull(),
    durationSeconds: integer("duration_seconds").notNull().default(0),
    categoryId: integer("category_id").references(() => wasteCategories.id, { 
      onDelete: "set null", 
      onUpdate: "cascade" 
    }),
    tabId: integer("tab_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => sql`now()`),
  },
  (table) => ({
    tenantUserStartTimeIdx: index("browsing_sessions_tenant_user_start_time_idx").on(
      table.tenantId,
      table.userId,
      table.startTime
    ),
    tenantUserDomainIdx: index("browsing_sessions_tenant_user_domain_idx").on(
      table.tenantId,
      table.userId,
      table.domain
    ),
    deviceIdIdx: index("browsing_sessions_device_id_idx").on(table.deviceId),
    domainIdx: index("browsing_sessions_domain_idx").on(table.domain),
    categoryIdIdx: index("browsing_sessions_category_id_idx").on(table.categoryId),
    
    // RLS ポリシー
    selectOwnPolicy: pgPolicy("browsing_sessions_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = ${table.userId} 
        AND users.auth_user_id = auth.uid()
      )`,
    }),
    
    updateOwnPolicy: pgPolicy("browsing_sessions_update_own", {
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
    
    insertOwnPolicy: pgPolicy("browsing_sessions_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = ${table.userId} 
        AND users.auth_user_id = auth.uid()
      )`,
    }),
    
    deleteOwnPolicy: pgPolicy("browsing_sessions_delete_own", {
      for: "delete",
      to: authenticatedRole,
      using: sql`EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = ${table.userId} 
        AND users.auth_user_id = auth.uid()
      )`,
    }),
    
    serviceRolePolicy: pgPolicy("browsing_sessions_service_role_all", {
      for: "all",
      to: serviceRole,
      using: sql`true`,
      withCheck: sql`true`,
    }),
  })
);
