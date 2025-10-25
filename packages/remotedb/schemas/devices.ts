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
import { users } from "./users";

export const DEVICE_TYPE_VALUES = ["desktop", "mobile", "tablet", "browser"] as const;
export type DeviceType = (typeof DEVICE_TYPE_VALUES)[number];
export const DEVICE_TYPE_LABEL: Record<DeviceType, string> = {
  desktop: "デスクトップ",
  mobile: "モバイル",
  tablet: "タブレット",
  browser: "ブラウザ",
};
export const deviceTypeEnum = pgEnum("device_type", DEVICE_TYPE_VALUES);

export const DEVICE_STATUS_VALUES = ["active", "inactive", "archived"] as const;
export type DeviceStatus = (typeof DEVICE_STATUS_VALUES)[number];
export const DEVICE_STATUS_LABEL: Record<DeviceStatus, string> = {
  active: "アクティブ",
  inactive: "非アクティブ",
  archived: "アーカイブ済み",
};
export const deviceStatusEnum = pgEnum("device_status", DEVICE_STATUS_VALUES);

export const devices = pgTable(
  "devices",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    publicId: uuid("public_id").notNull().defaultRandom(),
    tenantId: integer("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade", onUpdate: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(), // ユーザーが設定するデバイス名
    deviceType: deviceTypeEnum("device_type").notNull(),
    deviceId: varchar("device_id", { length: 500 }).notNull(), // デバイス固有の識別子（ハードウェアID、ブラウザフィンガープリントなど）
    userAgent: varchar("user_agent", { length: 1000 }), // ユーザーエージェント文字列
    platform: varchar("platform", { length: 100 }), // OS情報
    status: deviceStatusEnum("status").notNull().default("active"),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
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
    tenantUserIdx: index("devices_tenant_user_idx").on(
      table.tenantId,
      table.userId
    ),
    deviceTypeIdx: index("devices_device_type_idx").on(table.deviceType),
    statusIdx: index("devices_status_idx").on(table.status),
    isActiveIdx: index("devices_is_active_idx").on(table.isActive),
    lastSeenAtIdx: index("devices_last_seen_at_idx").on(table.lastSeenAt),
    publicIdUidIdx: unique("devices_public_id_uidx").on(table.publicId),
    // 同じテナント・ユーザー内でデバイスIDは一意である必要がある
    tenantUserDeviceIdUidIdx: uniqueIndex("devices_tenant_user_device_id_uidx").on(
      table.tenantId,
      table.userId,
      table.deviceId
    ),
    
    // RLS ポリシー
    selectOwnPolicy: pgPolicy("devices_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = ${table.userId} 
        AND users.auth_user_id = auth.uid()
      )`,
    }),
    
    updateOwnPolicy: pgPolicy("devices_update_own", {
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
    
    insertOwnPolicy: pgPolicy("devices_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = ${table.userId} 
        AND users.auth_user_id = auth.uid()
      )`,
    }),
    
    deleteOwnPolicy: pgPolicy("devices_delete_own", {
      for: "delete",
      to: authenticatedRole,
      using: sql`EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = ${table.userId} 
        AND users.auth_user_id = auth.uid()
      )`,
    }),
    
    serviceRolePolicy: pgPolicy("devices_service_role_all", {
      for: "all",
      to: serviceRole,
      using: sql`true`,
      withCheck: sql`true`,
    }),
  })
);
