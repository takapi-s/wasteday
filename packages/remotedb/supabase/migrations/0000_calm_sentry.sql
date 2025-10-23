CREATE TYPE "public"."session_category" AS ENUM('app', 'browser', 'system');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'member', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."user_state" AS ENUM('active', 'idle');--> statement-breakpoint
CREATE TYPE "public"."waste_category_type" AS ENUM('app', 'url', 'system');--> statement-breakpoint
CREATE TYPE "public"."waste_label" AS ENUM('waste', 'productive');--> statement-breakpoint
CREATE TABLE "browsing_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"domain" varchar(255) NOT NULL,
	"url" text NOT NULL,
	"title" text,
	"start_time" timestamp with time zone NOT NULL,
	"duration_seconds" integer DEFAULT 0 NOT NULL,
	"category_id" integer,
	"tab_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "domains" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "domains_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenant_id" integer NOT NULL,
	"user_id" integer,
	"domain" varchar(255) NOT NULL,
	"category_id" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "domains_tenant_user_domain_uid" UNIQUE("tenant_id","user_id","domain")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"start_time" timestamp with time zone NOT NULL,
	"duration_seconds" integer NOT NULL,
	"category" "session_category" NOT NULL,
	"identifier" varchar(500) NOT NULL,
	"user_state" "user_state" NOT NULL,
	"window_title" text,
	"url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "tenants_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_settings_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenant_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"key" varchar(100) NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_settings_tenant_user_key_uid" UNIQUE("tenant_id","user_id","key")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" integer NOT NULL,
	"email" varchar(255) NOT NULL,
	"clerk_user_id" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"role" "user_role" DEFAULT 'member' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_public_id_uidx" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "waste_categories" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "waste_categories_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenant_id" integer NOT NULL,
	"user_id" integer,
	"type" "waste_category_type" NOT NULL,
	"identifier" varchar(500) NOT NULL,
	"label" "waste_label" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "waste_categories_tenant_user_type_identifier_uid" UNIQUE("tenant_id","user_id","type","identifier")
);
--> statement-breakpoint
ALTER TABLE "browsing_sessions" ADD CONSTRAINT "browsing_sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "browsing_sessions" ADD CONSTRAINT "browsing_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "browsing_sessions" ADD CONSTRAINT "browsing_sessions_category_id_waste_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."waste_categories"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "domains" ADD CONSTRAINT "domains_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "domains" ADD CONSTRAINT "domains_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "domains" ADD CONSTRAINT "domains_category_id_waste_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."waste_categories"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "waste_categories" ADD CONSTRAINT "waste_categories_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "waste_categories" ADD CONSTRAINT "waste_categories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "browsing_sessions_tenant_user_start_time_idx" ON "browsing_sessions" USING btree ("tenant_id","user_id","start_time");--> statement-breakpoint
CREATE INDEX "browsing_sessions_tenant_user_domain_idx" ON "browsing_sessions" USING btree ("tenant_id","user_id","domain");--> statement-breakpoint
CREATE INDEX "browsing_sessions_domain_idx" ON "browsing_sessions" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "browsing_sessions_category_id_idx" ON "browsing_sessions" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "domains_tenant_user_domain_idx" ON "domains" USING btree ("tenant_id","user_id","domain");--> statement-breakpoint
CREATE INDEX "domains_domain_idx" ON "domains" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "domains_category_id_idx" ON "domains" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "domains_is_active_idx" ON "domains" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "sessions_tenant_user_start_time_idx" ON "sessions" USING btree ("tenant_id","user_id","start_time");--> statement-breakpoint
CREATE INDEX "sessions_tenant_user_category_idx" ON "sessions" USING btree ("tenant_id","user_id","category");--> statement-breakpoint
CREATE INDEX "sessions_identifier_idx" ON "sessions" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "tenants_name_idx" ON "tenants" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "tenants_public_id_uidx" ON "tenants" USING btree ("public_id");--> statement-breakpoint
CREATE INDEX "user_settings_tenant_user_idx" ON "user_settings" USING btree ("tenant_id","user_id");--> statement-breakpoint
CREATE INDEX "user_settings_key_idx" ON "user_settings" USING btree ("key");--> statement-breakpoint
CREATE INDEX "users_tenant_id_idx" ON "users" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "users_is_active_idx" ON "users" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "users_clerk_user_id_uidx" ON "users" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uidx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "waste_categories_tenant_user_type_idx" ON "waste_categories" USING btree ("tenant_id","user_id","type");--> statement-breakpoint
CREATE INDEX "waste_categories_tenant_user_label_idx" ON "waste_categories" USING btree ("tenant_id","user_id","label");--> statement-breakpoint
CREATE INDEX "waste_categories_is_active_idx" ON "waste_categories" USING btree ("is_active");