import {
  index,
  integer,
  pgPolicy,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { authenticatedRole, serviceRole } from "drizzle-orm/supabase";

export const tenants = pgTable(
  "tenants",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    publicId: uuid("public_id").notNull().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => sql`now()`),
  },
  (table) => ({
    nameIdx: index("tenants_name_idx").on(table.name),
    publicIdIdx: uniqueIndex("tenants_public_id_uidx").on(table.publicId),
    
    // RLS ポリシー
    // テナント内のユーザーは自分のテナントを閲覧可能
    selectOwnPolicy: pgPolicy("tenants_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`EXISTS (
        SELECT 1 FROM users 
        WHERE users.tenant_id = ${table.id} 
        AND users.auth_user_id = auth.uid()
      )`,
    }),
    
    serviceRolePolicy: pgPolicy("tenants_service_role_all", {
      for: "all",
      to: serviceRole,
      using: sql`true`,
      withCheck: sql`true`,
    }),
  })
);

