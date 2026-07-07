CREATE TABLE IF NOT EXISTS "ai_chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"role" varchar(16) NOT NULL,
	"content" text NOT NULL,
	"suggested_replies" jsonb DEFAULT '[]'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_chat_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"fan_id" uuid,
	"persona" varchar(64),
	"tone" varchar(64),
	"title" varchar(255),
	"message_count" integer DEFAULT 0,
	"is_archived" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_models" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(64) NOT NULL,
	"name" varchar(128) NOT NULL,
	"provider" varchar(64) NOT NULL,
	"model_version" varchar(64),
	"capabilities" jsonb NOT NULL,
	"cost_per_request" numeric(10, 6) DEFAULT '0.01' NOT NULL,
	"context_window" integer DEFAULT 128000,
	"is_active" boolean DEFAULT true,
	"embedding" vector(384),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "analytics_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid,
	"session_id" uuid,
	"event_type" varchar(64) NOT NULL,
	"event_name" varchar(128),
	"page_path" varchar(512),
	"referrer" text,
	"user_agent" text,
	"ip_address" varchar(45),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"value" numeric(12, 4),
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid,
	"action" varchar(64) NOT NULL,
	"resource_type" varchar(64),
	"resource_id" uuid,
	"details" jsonb DEFAULT '{}'::jsonb,
	"ip_address" varchar(45),
	"user_agent" text,
	"severity" varchar(16) DEFAULT 'info',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auto_message_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"trigger" varchar(64) NOT NULL,
	"delay_hours" integer DEFAULT 0,
	"message" text NOT NULL,
	"include_ppv" boolean DEFAULT false,
	"ppv_campaign_id" uuid,
	"status" varchar(32) DEFAULT 'active',
	"total_sent" integer DEFAULT 0,
	"total_opens" integer DEFAULT 0,
	"total_conversions" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "autopilot_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"is_enabled" boolean DEFAULT false,
	"mode" varchar(32) DEFAULT 'assist',
	"max_auto_replies_per_hour" integer DEFAULT 50,
	"require_approval_above" numeric(10, 2),
	"auto_greet_new_fans" boolean DEFAULT false,
	"auto_sell_ppv" boolean DEFAULT false,
	"greeting_message" text,
	"total_auto_replies" integer DEFAULT 0,
	"revenue_generated" numeric(12, 2) DEFAULT '0',
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "autopilot_config_workspace_id_unique" UNIQUE("workspace_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "broadcast_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"include_ppv" boolean DEFAULT false,
	"ppv_campaign_id" uuid,
	"target_list_id" uuid,
	"personalization_fields" jsonb DEFAULT '[]'::jsonb,
	"status" varchar(32) DEFAULT 'draft',
	"scheduled_for" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"total_targeted" integer DEFAULT 0,
	"total_delivered" integer DEFAULT 0,
	"total_opens" integer DEFAULT 0,
	"total_conversions" integer DEFAULT 0,
	"revenue" numeric(12, 2) DEFAULT '0',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "broadcast_recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"fan_id" uuid NOT NULL,
	"delivered" boolean DEFAULT false,
	"opened_at" timestamp with time zone,
	"purchased" boolean DEFAULT false,
	"revenue" numeric(12, 2) DEFAULT '0'
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bump_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"inactive_days" integer NOT NULL,
	"message" text NOT NULL,
	"include_ppv" boolean DEFAULT false,
	"ppv_campaign_id" uuid,
	"is_active" boolean DEFAULT true,
	"max_bumps_per_fan" integer DEFAULT 3,
	"cooldown_days" integer DEFAULT 7,
	"total_sent" integer DEFAULT 0,
	"re_engaged" integer DEFAULT 0,
	"revenue_recovered" numeric(12, 2) DEFAULT '0',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bump_sent" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bump_rule_id" uuid NOT NULL,
	"fan_id" uuid NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded" boolean DEFAULT false,
	"purchased" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chatter_shifts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"chatter_id" uuid NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"total_messages" integer DEFAULT 0,
	"total_ppv_sent" integer DEFAULT 0,
	"total_purchases" integer DEFAULT 0,
	"conversion_rate" numeric(5, 2) DEFAULT '0',
	"revenue" numeric(12, 2) DEFAULT '0',
	"avg_response_time" integer,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "content_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(255),
	"body" text,
	"platform" varchar(32),
	"status" varchar(32) DEFAULT 'draft',
	"scheduled_for" timestamp with time zone,
	"published_at" timestamp with time zone,
	"engagement" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "content_generations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"ai_model_id" uuid NOT NULL,
	"draft_id" uuid,
	"prompt" text NOT NULL,
	"generated_content" text NOT NULL,
	"platform" varchar(32),
	"tone" varchar(32),
	"cost_incurred" numeric(10, 6) DEFAULT '0' NOT NULL,
	"tokens_used" integer DEFAULT 0,
	"latency_ms" integer,
	"embedding" vector(384),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "content_strategies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"slug" varchar(64) NOT NULL,
	"name" varchar(128) NOT NULL,
	"description" text,
	"platform" varchar(32) DEFAULT 'generic',
	"hooks" jsonb DEFAULT '[]'::jsonb,
	"captions" jsonb DEFAULT '[]'::jsonb,
	"ctas" jsonb DEFAULT '[]'::jsonb,
	"template_schema" jsonb,
	"embedding" vector(384),
	"is_built_in" boolean DEFAULT false,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "conversation_flows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"keyword" varchar(128),
	"is_active" boolean DEFAULT true,
	"total_triggered" integer DEFAULT 0,
	"total_conversions" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fan_activity_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"fan_id" uuid NOT NULL,
	"activity_type" varchar(64) NOT NULL,
	"description" text,
	"value" numeric(12, 2),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fan_list_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"list_id" uuid NOT NULL,
	"fan_id" uuid NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fan_lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"is_dynamic" boolean DEFAULT false,
	"dynamic_criteria" jsonb DEFAULT '{}'::jsonb,
	"member_count" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fan_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"fan_id" uuid NOT NULL,
	"tier" varchar(32),
	"price" numeric(10, 2),
	"status" varchar(32) DEFAULT 'active',
	"started_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fan_tag_assignments" (
	"fan_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fan_tag_assignments_fan_id_tag_id_pk" PRIMARY KEY("fan_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fan_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" varchar(128) NOT NULL,
	"color" varchar(7) DEFAULT '#8B5CF6'
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" varchar(255),
	"handle" varchar(255),
	"platform" varchar(32),
	"platform_id" varchar(255),
	"status" varchar(32) DEFAULT 'active',
	"score" integer DEFAULT 0,
	"total_spend" numeric(12, 2) DEFAULT '0',
	"avg_spend" numeric(12, 2) DEFAULT '0',
	"total_messages" integer DEFAULT 0,
	"last_message_at" timestamp with time zone,
	"last_active_at" timestamp with time zone,
	"subscribed_at" timestamp with time zone,
	"churned_at" timestamp with time zone,
	"notes" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "flow_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"flow_id" uuid NOT NULL,
	"step_order" integer NOT NULL,
	"message" text NOT NULL,
	"delay_minutes" integer DEFAULT 0,
	"condition" jsonb DEFAULT '{}'::jsonb,
	"ppv_campaign_id" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"subscription_id" uuid NOT NULL,
	"stripe_invoice_id" varchar(255),
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'usd',
	"status" varchar(32) DEFAULT 'pending',
	"paid_at" timestamp with time zone,
	"due_date" timestamp with time zone,
	"invoice_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "keyword_triggers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" varchar(128) NOT NULL,
	"keywords" jsonb NOT NULL,
	"response" text NOT NULL,
	"ppv_campaign_id" uuid,
	"is_active" boolean DEFAULT true,
	"match_type" varchar(16) DEFAULT 'exact',
	"total_matches" integer DEFAULT 0,
	"total_conversions" integer DEFAULT 0,
	"revenue" numeric(12, 2) DEFAULT '0',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "media_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"url" text NOT NULL,
	"type" varchar(32),
	"title" varchar(255),
	"description" text,
	"file_size" integer,
	"mime_type" varchar(64),
	"labels" jsonb DEFAULT '[]'::jsonb,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "media_labels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" varchar(128) NOT NULL,
	"color" varchar(7) DEFAULT '#06B6D4'
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "message_guard_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"word" varchar(128) NOT NULL,
	"action" varchar(16) DEFAULT 'block',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "onboarding_funnel_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"funnel_id" uuid NOT NULL,
	"step_order" integer NOT NULL,
	"delay_hours" integer DEFAULT 0,
	"message" text NOT NULL,
	"ppv_campaign_id" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "onboarding_funnels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT true,
	"total_triggered" integer DEFAULT 0,
	"total_converted" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ppv_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"media_url" text,
	"media_type" varchar(32),
	"price" numeric(10, 2) NOT NULL,
	"status" varchar(32) DEFAULT 'draft',
	"target_list_id" uuid,
	"scheduled_for" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"total_sent" integer DEFAULT 0,
	"total_opens" integer DEFAULT 0,
	"total_purchases" integer DEFAULT 0,
	"revenue" numeric(12, 2) DEFAULT '0',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ppv_purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"fan_id" uuid NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"status" varchar(32) DEFAULT 'completed',
	"refunded_at" timestamp with time zone,
	"purchased_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "prompt_library" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"category" varchar(64),
	"is_favorite" boolean DEFAULT false,
	"usage_count" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "role_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"role" varchar(32) NOT NULL,
	"resource" varchar(64) NOT NULL,
	"action" varchar(32) NOT NULL,
	"is_allowed" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"workspace_id" uuid,
	"refresh_token" text NOT NULL,
	"user_agent" text,
	"ip_address" varchar(45),
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "shift_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" varchar(5) NOT NULL,
	"end_time" varchar(5) NOT NULL,
	"timezone" varchar(64) DEFAULT 'UTC',
	"is_recurring" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "social_funnels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"platform" varchar(32) NOT NULL,
	"trigger" varchar(64) NOT NULL,
	"keywords" jsonb DEFAULT '[]'::jsonb,
	"auto_dm_message" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"total_triggered" integer DEFAULT 0,
	"total_converted" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subscription_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(64) NOT NULL,
	"name" varchar(128) NOT NULL,
	"price" numeric(8, 2) NOT NULL,
	"ai_generations_limit" integer NOT NULL,
	"social_platforms" integer DEFAULT 1 NOT NULL,
	"seats" integer DEFAULT 1 NOT NULL,
	"has_advanced_analytics" boolean DEFAULT false,
	"has_api_access" boolean DEFAULT false,
	"has_priority_support" boolean DEFAULT false,
	"has_team_management" boolean DEFAULT false,
	"features" jsonb DEFAULT '[]'::jsonb,
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "traffic_clicks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"referrer" text,
	"converted_to_fan" boolean DEFAULT false,
	"fan_id" uuid,
	"revenue" numeric(12, 2) DEFAULT '0',
	"clicked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "traffic_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"url" text,
	"platform" varchar(64),
	"utm_source" varchar(128),
	"utm_medium" varchar(128),
	"utm_campaign" varchar(128),
	"tracking_code" varchar(64),
	"is_active" boolean DEFAULT true,
	"total_clicks" integer DEFAULT 0,
	"total_subscriptions" integer DEFAULT 0,
	"total_revenue" numeric(12, 2) DEFAULT '0',
	"roi" numeric(8, 2) DEFAULT '0',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "usage_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid,
	"record_type" varchar(32) NOT NULL,
	"quantity" integer DEFAULT 1,
	"cost" numeric(10, 6) DEFAULT '0',
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"key_prefix" varchar(8) NOT NULL,
	"key_hash" text NOT NULL,
	"name" varchar(128),
	"permissions" jsonb DEFAULT '[]'::jsonb,
	"last_used_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"theme" varchar(16) DEFAULT 'dark',
	"email_notifications" boolean DEFAULT true,
	"extra_config" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"email_verified" boolean DEFAULT false,
	"password_hash" text NOT NULL,
	"display_name" varchar(128) NOT NULL,
	"avatar_url" text,
	"default_workspace_id" uuid,
	"two_factor_enabled" boolean DEFAULT false,
	"two_factor_secret" text,
	"account_locked" boolean DEFAULT false,
	"failed_login_attempts" integer DEFAULT 0,
	"locked_until" timestamp with time zone,
	"refresh_token" text,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workspace_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"role" varchar(32) DEFAULT 'editor' NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workspace_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar(32) DEFAULT 'editor' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"invited_by" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workspace_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"status" varchar(32) DEFAULT 'trialing',
	"current_period_start" timestamp with time zone NOT NULL,
	"current_period_end" timestamp with time zone NOT NULL,
	"canceled_at" timestamp with time zone,
	"trial_ends_at" timestamp with time zone,
	"stripe_customer_id" varchar(255),
	"stripe_subscription_id" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_subscriptions_workspace_id_unique" UNIQUE("workspace_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(128) NOT NULL,
	"plan" varchar(32) DEFAULT 'standard' NOT NULL,
	"is_trialing" boolean DEFAULT true,
	"trial_ends_at" timestamp with time zone,
	"ai_generations_used" integer DEFAULT 0,
	"ai_generations_limit" integer DEFAULT 100,
	"total_fans" integer DEFAULT 0,
	"total_revenue" numeric(14, 2) DEFAULT '0',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_chat_messages" ADD CONSTRAINT "ai_chat_messages_session_id_ai_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."ai_chat_sessions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_chat_sessions" ADD CONSTRAINT "ai_chat_sessions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_chat_sessions" ADD CONSTRAINT "ai_chat_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "auto_message_campaigns" ADD CONSTRAINT "auto_message_campaigns_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "auto_message_campaigns" ADD CONSTRAINT "auto_message_campaigns_ppv_campaign_id_ppv_campaigns_id_fk" FOREIGN KEY ("ppv_campaign_id") REFERENCES "public"."ppv_campaigns"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "autopilot_config" ADD CONSTRAINT "autopilot_config_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "autopilot_config" ADD CONSTRAINT "autopilot_config_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "broadcast_campaigns" ADD CONSTRAINT "broadcast_campaigns_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "broadcast_campaigns" ADD CONSTRAINT "broadcast_campaigns_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "broadcast_campaigns" ADD CONSTRAINT "broadcast_campaigns_ppv_campaign_id_ppv_campaigns_id_fk" FOREIGN KEY ("ppv_campaign_id") REFERENCES "public"."ppv_campaigns"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "broadcast_campaigns" ADD CONSTRAINT "broadcast_campaigns_target_list_id_fan_lists_id_fk" FOREIGN KEY ("target_list_id") REFERENCES "public"."fan_lists"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "broadcast_recipients" ADD CONSTRAINT "broadcast_recipients_campaign_id_broadcast_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."broadcast_campaigns"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "broadcast_recipients" ADD CONSTRAINT "broadcast_recipients_fan_id_fans_id_fk" FOREIGN KEY ("fan_id") REFERENCES "public"."fans"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bump_rules" ADD CONSTRAINT "bump_rules_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bump_rules" ADD CONSTRAINT "bump_rules_ppv_campaign_id_ppv_campaigns_id_fk" FOREIGN KEY ("ppv_campaign_id") REFERENCES "public"."ppv_campaigns"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bump_sent" ADD CONSTRAINT "bump_sent_bump_rule_id_bump_rules_id_fk" FOREIGN KEY ("bump_rule_id") REFERENCES "public"."bump_rules"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bump_sent" ADD CONSTRAINT "bump_sent_fan_id_fans_id_fk" FOREIGN KEY ("fan_id") REFERENCES "public"."fans"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chatter_shifts" ADD CONSTRAINT "chatter_shifts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chatter_shifts" ADD CONSTRAINT "chatter_shifts_chatter_id_users_id_fk" FOREIGN KEY ("chatter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "content_drafts" ADD CONSTRAINT "content_drafts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "content_drafts" ADD CONSTRAINT "content_drafts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "content_generations" ADD CONSTRAINT "content_generations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "content_generations" ADD CONSTRAINT "content_generations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "content_generations" ADD CONSTRAINT "content_generations_ai_model_id_ai_models_id_fk" FOREIGN KEY ("ai_model_id") REFERENCES "public"."ai_models"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "content_generations" ADD CONSTRAINT "content_generations_draft_id_content_drafts_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."content_drafts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "content_strategies" ADD CONSTRAINT "content_strategies_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "content_strategies" ADD CONSTRAINT "content_strategies_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "conversation_flows" ADD CONSTRAINT "conversation_flows_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fan_activity_log" ADD CONSTRAINT "fan_activity_log_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fan_activity_log" ADD CONSTRAINT "fan_activity_log_fan_id_fans_id_fk" FOREIGN KEY ("fan_id") REFERENCES "public"."fans"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fan_list_members" ADD CONSTRAINT "fan_list_members_list_id_fan_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."fan_lists"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fan_list_members" ADD CONSTRAINT "fan_list_members_fan_id_fans_id_fk" FOREIGN KEY ("fan_id") REFERENCES "public"."fans"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fan_lists" ADD CONSTRAINT "fan_lists_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fan_subscriptions" ADD CONSTRAINT "fan_subscriptions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fan_subscriptions" ADD CONSTRAINT "fan_subscriptions_fan_id_fans_id_fk" FOREIGN KEY ("fan_id") REFERENCES "public"."fans"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fan_tag_assignments" ADD CONSTRAINT "fan_tag_assignments_fan_id_fans_id_fk" FOREIGN KEY ("fan_id") REFERENCES "public"."fans"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fan_tag_assignments" ADD CONSTRAINT "fan_tag_assignments_tag_id_fan_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."fan_tags"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fan_tags" ADD CONSTRAINT "fan_tags_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fans" ADD CONSTRAINT "fans_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "flow_steps" ADD CONSTRAINT "flow_steps_flow_id_conversation_flows_id_fk" FOREIGN KEY ("flow_id") REFERENCES "public"."conversation_flows"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "flow_steps" ADD CONSTRAINT "flow_steps_ppv_campaign_id_ppv_campaigns_id_fk" FOREIGN KEY ("ppv_campaign_id") REFERENCES "public"."ppv_campaigns"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invoices" ADD CONSTRAINT "invoices_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invoices" ADD CONSTRAINT "invoices_subscription_id_workspace_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."workspace_subscriptions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "keyword_triggers" ADD CONSTRAINT "keyword_triggers_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "keyword_triggers" ADD CONSTRAINT "keyword_triggers_ppv_campaign_id_ppv_campaigns_id_fk" FOREIGN KEY ("ppv_campaign_id") REFERENCES "public"."ppv_campaigns"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "media_items" ADD CONSTRAINT "media_items_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "media_items" ADD CONSTRAINT "media_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "media_labels" ADD CONSTRAINT "media_labels_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "message_guard_rules" ADD CONSTRAINT "message_guard_rules_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "onboarding_funnel_steps" ADD CONSTRAINT "onboarding_funnel_steps_funnel_id_onboarding_funnels_id_fk" FOREIGN KEY ("funnel_id") REFERENCES "public"."onboarding_funnels"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "onboarding_funnel_steps" ADD CONSTRAINT "onboarding_funnel_steps_ppv_campaign_id_ppv_campaigns_id_fk" FOREIGN KEY ("ppv_campaign_id") REFERENCES "public"."ppv_campaigns"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "onboarding_funnels" ADD CONSTRAINT "onboarding_funnels_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ppv_campaigns" ADD CONSTRAINT "ppv_campaigns_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ppv_campaigns" ADD CONSTRAINT "ppv_campaigns_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ppv_campaigns" ADD CONSTRAINT "ppv_campaigns_target_list_id_fan_lists_id_fk" FOREIGN KEY ("target_list_id") REFERENCES "public"."fan_lists"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ppv_purchases" ADD CONSTRAINT "ppv_purchases_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ppv_purchases" ADD CONSTRAINT "ppv_purchases_campaign_id_ppv_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."ppv_campaigns"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ppv_purchases" ADD CONSTRAINT "ppv_purchases_fan_id_fans_id_fk" FOREIGN KEY ("fan_id") REFERENCES "public"."fans"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "prompt_library" ADD CONSTRAINT "prompt_library_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "prompt_library" ADD CONSTRAINT "prompt_library_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessions" ADD CONSTRAINT "sessions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shift_schedules" ADD CONSTRAINT "shift_schedules_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shift_schedules" ADD CONSTRAINT "shift_schedules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "social_funnels" ADD CONSTRAINT "social_funnels_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "traffic_clicks" ADD CONSTRAINT "traffic_clicks_source_id_traffic_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."traffic_sources"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "traffic_clicks" ADD CONSTRAINT "traffic_clicks_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "traffic_clicks" ADD CONSTRAINT "traffic_clicks_fan_id_fans_id_fk" FOREIGN KEY ("fan_id") REFERENCES "public"."fans"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "traffic_sources" ADD CONSTRAINT "traffic_sources_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_api_keys" ADD CONSTRAINT "user_api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_api_keys" ADD CONSTRAINT "user_api_keys_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_default_workspace_id_workspaces_id_fk" FOREIGN KEY ("default_workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workspace_invitations" ADD CONSTRAINT "workspace_invitations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workspace_subscriptions" ADD CONSTRAINT "workspace_subscriptions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workspace_subscriptions" ADD CONSTRAINT "workspace_subscriptions_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_messages_session_idx" ON "ai_chat_messages" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_sessions_ws_idx" ON "ai_chat_sessions" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_sessions_user_idx" ON "ai_chat_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_sessions_fan_idx" ON "ai_chat_sessions" USING btree ("fan_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ai_models_slug_idx" ON "ai_models" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "analytics_events_ws_idx" ON "analytics_events" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "analytics_events_type_idx" ON "analytics_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "analytics_events_occurred_at_idx" ON "analytics_events" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_ws_idx" ON "audit_logs" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auto_msg_campaigns_ws_idx" ON "auto_message_campaigns" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auto_msg_campaigns_trigger_idx" ON "auto_message_campaigns" USING btree ("trigger");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "broadcast_campaigns_ws_idx" ON "broadcast_campaigns" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "broadcast_campaigns_status_idx" ON "broadcast_campaigns" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "broadcast_recipients_campaign_idx" ON "broadcast_recipients" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "broadcast_recipients_fan_idx" ON "broadcast_recipients" USING btree ("fan_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bump_rules_ws_idx" ON "bump_rules" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bump_sent_rule_fan_idx" ON "bump_sent" USING btree ("bump_rule_id","fan_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chatter_shifts_ws_idx" ON "chatter_shifts" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chatter_shifts_chatter_idx" ON "chatter_shifts" USING btree ("chatter_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chatter_shifts_started_at_idx" ON "chatter_shifts" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_drafts_ws_idx" ON "content_drafts" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_drafts_status_idx" ON "content_drafts" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_drafts_platform_idx" ON "content_drafts" USING btree ("platform");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_generations_ws_idx" ON "content_generations" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_generations_user_idx" ON "content_generations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_generations_created_at_idx" ON "content_generations" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_strategies_ws_idx" ON "content_strategies" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conv_flows_ws_idx" ON "conversation_flows" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fan_activity_fan_idx" ON "fan_activity_log" USING btree ("fan_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fan_activity_type_idx" ON "fan_activity_log" USING btree ("activity_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fan_activity_occurred_at_idx" ON "fan_activity_log" USING btree ("occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "fan_list_members_list_fan_idx" ON "fan_list_members" USING btree ("list_id","fan_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fan_list_members_fan_idx" ON "fan_list_members" USING btree ("fan_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fan_lists_ws_idx" ON "fan_lists" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fan_subs_fan_idx" ON "fan_subscriptions" USING btree ("fan_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fan_subs_status_idx" ON "fan_subscriptions" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "fan_tags_ws_name_idx" ON "fan_tags" USING btree ("workspace_id","name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fans_ws_idx" ON "fans" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fans_status_idx" ON "fans" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fans_score_idx" ON "fans" USING btree ("score");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fans_platform_idx" ON "fans" USING btree ("platform");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fans_handle_idx" ON "fans" USING btree ("handle");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "flow_steps_flow_order_idx" ON "flow_steps" USING btree ("flow_id","step_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoices_ws_idx" ON "invoices" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoices_status_idx" ON "invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "keyword_triggers_ws_idx" ON "keyword_triggers" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "keyword_triggers_active_idx" ON "keyword_triggers" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "media_items_ws_idx" ON "media_items" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "media_items_type_idx" ON "media_items" USING btree ("type");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "media_labels_ws_name_idx" ON "media_labels" USING btree ("workspace_id","name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "msg_guard_ws_idx" ON "message_guard_rules" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "onboarding_steps_funnel_order_idx" ON "onboarding_funnel_steps" USING btree ("funnel_id","step_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "onboarding_funnels_ws_idx" ON "onboarding_funnels" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ppv_campaigns_ws_idx" ON "ppv_campaigns" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ppv_campaigns_status_idx" ON "ppv_campaigns" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ppv_purchases_campaign_idx" ON "ppv_purchases" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ppv_purchases_fan_idx" ON "ppv_purchases" USING btree ("fan_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "prompt_library_ws_idx" ON "prompt_library" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "prompt_library_category_idx" ON "prompt_library" USING btree ("category");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "role_perms_role_resource_action_idx" ON "role_permissions" USING btree ("workspace_id","role","resource","action");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sessions_refresh_token_idx" ON "sessions" USING btree ("refresh_token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shift_schedules_ws_idx" ON "shift_schedules" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shift_schedules_user_day_idx" ON "shift_schedules" USING btree ("user_id","day_of_week");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "social_funnels_ws_idx" ON "social_funnels" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "social_funnels_platform_idx" ON "social_funnels" USING btree ("platform");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "subscription_plans_slug_idx" ON "subscription_plans" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subscription_plans_active_idx" ON "subscription_plans" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "traffic_clicks_source_idx" ON "traffic_clicks" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "traffic_clicks_ws_idx" ON "traffic_clicks" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "traffic_clicks_clicked_at_idx" ON "traffic_clicks" USING btree ("clicked_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "traffic_sources_ws_idx" ON "traffic_sources" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "traffic_sources_code_idx" ON "traffic_sources" USING btree ("tracking_code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "usage_records_ws_idx" ON "usage_records" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "usage_records_type_idx" ON "usage_records" USING btree ("record_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "usage_records_recorded_at_idx" ON "usage_records" USING btree ("recorded_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_api_keys_hash_idx" ON "user_api_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_api_keys_ws_idx" ON "user_api_keys" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "workspace_members_ws_user_idx" ON "workspace_members" USING btree ("workspace_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workspace_members_role_idx" ON "workspace_members" USING btree ("role");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workspace_subs_status_idx" ON "workspace_subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workspace_subs_plan_idx" ON "workspace_subscriptions" USING btree ("plan_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "workspaces_slug_idx" ON "workspaces" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workspaces_plan_idx" ON "workspaces" USING btree ("plan");