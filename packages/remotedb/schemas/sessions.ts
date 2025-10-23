import {
  index,
  integer,
  pgEnum,
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

export const SESSION_CATEGORY_VALUES = ["app", "browser", "system"] as const;
export type SessionCategory = (typeof SESSION_CATEGORY_VALUES)[number];
export const sessionCategoryEnum = pgEnum("session_category", SESSION_CATEGORY_VALUES);

export const USER_STATE_VALUES = ["active", "idle"] as const;
export type UserState = (typeof USER_STATE_VALUES)[number];
export const userStateEnum = pgEnum("user_state", USER_STATE_VALUES);

export const sessions = pgTable(
  "sessions",
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
    startTime: timestamp("start_time", { withTimezone: true }).notNull(),
    durationSeconds: integer("duration_seconds").notNull(),
    category: sessionCategoryEnum("category").notNull(),
    identifier: varchar("identifier", { length: 500 }).notNull(),
    userState: userStateEnum("user_state").notNull(),
    windowTitle: text("window_title"),
    url: text("url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => sql`now()`),
  },
  (table) => ({
    tenantUserStartTimeIdx: index("sessions_tenant_user_start_time_idx").on(
      table.tenantId,
      table.userId,
      table.startTime
    ),
    tenantUserCategoryIdx: index("sessions_tenant_user_category_idx").on(
      table.tenantId,
      table.userId,
      table.category
    ),
    deviceIdIdx: index("sessions_device_id_idx").on(table.deviceId),
    identifierIdx: index("sessions_identifier_idx").on(table.identifier),
  })
);
