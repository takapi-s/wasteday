import {
  boolean,
  index,
  integer,
  pgEnum,
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

export const WASTE_CATEGORY_TYPE_VALUES = ["app", "url", "system"] as const;
export type WasteCategoryType = (typeof WASTE_CATEGORY_TYPE_VALUES)[number];
export const wasteCategoryTypeEnum = pgEnum("waste_category_type", WASTE_CATEGORY_TYPE_VALUES);

export const WASTE_LABEL_VALUES = ["waste", "productive"] as const;
export type WasteLabel = (typeof WASTE_LABEL_VALUES)[number];
export const wasteLabelEnum = pgEnum("waste_label", WASTE_LABEL_VALUES);

export const wasteCategories = pgTable(
  "waste_categories",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    tenantId: integer("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade", onUpdate: "cascade" }),
    userId: integer("user_id")
      .references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
    type: wasteCategoryTypeEnum("type").notNull(),
    identifier: varchar("identifier", { length: 500 }).notNull(),
    label: wasteLabelEnum("label").notNull(),
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
    tenantUserTypeIdx: index("waste_categories_tenant_user_type_idx").on(
      table.tenantId,
      table.userId,
      table.type
    ),
    tenantUserLabelIdx: index("waste_categories_tenant_user_label_idx").on(
      table.tenantId,
      table.userId,
      table.label
    ),
    isActiveIdx: index("waste_categories_is_active_idx").on(table.isActive),
    tenantUserTypeIdentifierUid: unique("waste_categories_tenant_user_type_identifier_uid").on(
      table.tenantId,
      table.userId,
      table.type,
      table.identifier
    ),
    
    // RLS ポリシー
    selectOwnPolicy: pgPolicy("waste_categories_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = ${table.userId} 
        AND users.auth_user_id = auth.uid()
      )`,
    }),
    
    updateOwnPolicy: pgPolicy("waste_categories_update_own", {
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
    
    insertOwnPolicy: pgPolicy("waste_categories_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = ${table.userId} 
        AND users.auth_user_id = auth.uid()
      )`,
    }),
    
    deleteOwnPolicy: pgPolicy("waste_categories_delete_own", {
      for: "delete",
      to: authenticatedRole,
      using: sql`EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = ${table.userId} 
        AND users.auth_user_id = auth.uid()
      )`,
    }),
    
    serviceRolePolicy: pgPolicy("waste_categories_service_role_all", {
      for: "all",
      to: serviceRole,
      using: sql`true`,
      withCheck: sql`true`,
    }),
  })
);
