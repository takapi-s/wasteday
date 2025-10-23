import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

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
  })
);
