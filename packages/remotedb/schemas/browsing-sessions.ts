import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

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
  })
);
