import {
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

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
  })
);
