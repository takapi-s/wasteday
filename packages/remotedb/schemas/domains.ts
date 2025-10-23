import {
  boolean,
  index,
  integer,
  pgTable,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

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
  })
);
