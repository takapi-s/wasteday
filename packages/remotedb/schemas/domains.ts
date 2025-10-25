import {
  boolean,
  index,
  integer,
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
import { wasteCategories } from "./waste-categories";

export const domains = pgTable(
  "domains",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    tenantId: integer("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade", onUpdate: "cascade" }),
    userId: integer("user_id")
      .references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
    domain: varchar("domain", { length: 255 }).notNull(),
    categoryId: integer("category_id").references(() => wasteCategories.id, { 
      onDelete: "set null", 
      onUpdate: "cascade" 
    }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => sql`now()`),
  },
  (table) => ({
    tenantUserDomainIdx: index("domains_tenant_user_domain_idx").on(
      table.tenantId,
      table.userId,
      table.domain
    ),
    domainIdx: index("domains_domain_idx").on(table.domain),
    categoryIdIdx: index("domains_category_id_idx").on(table.categoryId),
    isActiveIdx: index("domains_is_active_idx").on(table.isActive),
    tenantUserDomainUid: unique("domains_tenant_user_domain_uid").on(
      table.tenantId,
      table.userId,
      table.domain
    ),
    
    // RLS ポリシー
    selectOwnPolicy: pgPolicy("domains_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = ${table.userId} 
        AND users.auth_user_id = auth.uid()
      )`,
    }),
    
    updateOwnPolicy: pgPolicy("domains_update_own", {
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
    
    insertOwnPolicy: pgPolicy("domains_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = ${table.userId} 
        AND users.auth_user_id = auth.uid()
      )`,
    }),
    
    deleteOwnPolicy: pgPolicy("domains_delete_own", {
      for: "delete",
      to: authenticatedRole,
      using: sql`EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = ${table.userId} 
        AND users.auth_user_id = auth.uid()
      )`,
    }),
    
    serviceRolePolicy: pgPolicy("domains_service_role_all", {
      for: "all",
      to: serviceRole,
      using: sql`true`,
      withCheck: sql`true`,
    }),
  })
);
