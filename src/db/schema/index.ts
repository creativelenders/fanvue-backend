import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  decimal,
  uniqueIndex,
  index,
  primaryKey,
  foreignKey,
  vector,
  customType,
  date,
  time,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ─── Helper: custom type for vector(384) ───────────────────────────
const vector384 = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return "vector(384)";
  },
  toDriver(value: number[]): string {
    return JSON.stringify(value);
  },
  fromDriver(value: string): number[] {
    return JSON.parse(value);
  },
});

// ═══════════════════════════════════════════════════════════════════
// 1. TENANCY: Workspaces & Members
// ═══════════════════════════════════════════════════════════════════

export const workspaces = pgTable(
  "workspaces",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 128 }).notNull(),
    plan: varchar("plan", { length: 32 }).notNull().default("standard"),
    isTrialing: boolean("is_trialing").default(true),
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
    aiGenerationsUsed: integer("ai_generations_used").default(0),
    aiGenerationsLimit: integer("ai_generations_limit").default(100),
    totalFans: integer("total_fans").default(0),
    totalRevenue: decimal("total_revenue", { precision: 14, scale: 2 }).default("0"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    slugIdx: uniqueIndex("workspaces_slug_idx").on(table.slug),
    planIdx: index("workspaces_plan_idx").on(table.plan),
  })
);

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 32 }).notNull().default("editor"), // owner | admin | editor | chatter
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
    invitedBy: uuid("invited_by").references(() => users.id),
  },
  (table) => ({
    workspaceUserIdx: uniqueIndex("workspace_members_ws_user_idx").on(
      table.workspaceId,
      table.userId
    ),
    roleIdx: index("workspace_members_role_idx").on(table.role),
  })
);

export const workspaceInvitations = pgTable("workspace_invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 255 }).notNull(),
  role: varchar("role", { length: 32 }).notNull().default("editor"),
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ═══════════════════════════════════════════════════════════════════
// 2. USERS & AUTH (expanded from original)
// ═══════════════════════════════════════════════════════════════════

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull(),
    emailVerified: boolean("email_verified").default(false),
    passwordHash: text("password_hash").notNull(),
    displayName: varchar("display_name", { length: 128 }).notNull(),
    avatarUrl: text("avatar_url"),
    role: varchar("role", { length: 32 }).notNull().default("user"),
    tier: varchar("tier", { length: 32 }).notNull().default("standard"),
    defaultWorkspaceId: uuid("default_workspace_id").references(() => workspaces.id),
    twoFactorEnabled: boolean("two_factor_enabled").default(false),
    twoFactorSecret: text("two_factor_secret"),
    accountLocked: boolean("account_locked").default(false),
    failedLoginAttempts: integer("failed_login_attempts").default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    refreshToken: text("refresh_token"),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    emailIdx: uniqueIndex("users_email_idx").on(table.email),
  })
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id").references(() => workspaces.id),
    refreshToken: text("refresh_token").notNull(),
    userAgent: text("user_agent"),
    ipAddress: varchar("ip_address", { length: 45 }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    refreshTokenIdx: uniqueIndex("sessions_refresh_token_idx").on(table.refreshToken),
    userIdIdx: index("sessions_user_id_idx").on(table.userId),
  })
);

export const userApiKeys = pgTable(
  "user_api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    keyPrefix: varchar("key_prefix", { length: 8 }).notNull(),
    keyHash: text("key_hash").notNull(),
    name: varchar("name", { length: 128 }),
    permissions: jsonb("permissions").$type<string[]>().default([]),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    keyHashIdx: uniqueIndex("user_api_keys_hash_idx").on(table.keyHash),
    workspaceIdx: index("user_api_keys_ws_idx").on(table.workspaceId),
  })
);

export const userPreferences = pgTable("user_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  theme: varchar("theme", { length: 16 }).default("dark"),
  emailNotifications: boolean("email_notifications").default(true),
  extraConfig: jsonb("extra_config").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ═══════════════════════════════════════════════════════════════════
// 3. CONTENT: Drafts, AI Generations, Strategies
// ═══════════════════════════════════════════════════════════════════

export const contentDrafts = pgTable(
  "content_drafts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }),
    body: text("body"),
    platform: varchar("platform", { length: 32 }), // tiktok | instagram | twitter | youtube | onlyfans
    status: varchar("status", { length: 32 }).default("draft"), // draft | published | archived
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    engagement: jsonb("engagement").$type<{ likes?: number; comments?: number; shares?: number }>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index("content_drafts_ws_idx").on(table.workspaceId),
    statusIdx: index("content_drafts_status_idx").on(table.status),
    platformIdx: index("content_drafts_platform_idx").on(table.platform),
  })
);

export const aiModels = pgTable(
  "ai_models",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 64 }).notNull(),
    name: varchar("name", { length: 128 }).notNull(),
    provider: varchar("provider", { length: 64 }).notNull(),
    modelVersion: varchar("model_version", { length: 64 }),
    capabilities: jsonb("capabilities")
      .$type<{ creativity: number; reasoning: number; logic: number; speed: number }>()
      .notNull(),
    costPerRequest: decimal("cost_per_request", { precision: 10, scale: 6 }).notNull().default("0.01"),
    contextWindow: integer("context_window").default(128000),
    isActive: boolean("is_active").default(true),
    embedding: vector384("embedding"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    slugIdx: uniqueIndex("ai_models_slug_idx").on(table.slug),
  })
);

export const contentGenerations = pgTable(
  "content_generations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    aiModelId: uuid("ai_model_id")
      .notNull()
      .references(() => aiModels.id),
    draftId: uuid("draft_id").references(() => contentDrafts.id, { onDelete: "set null" }),
    prompt: text("prompt").notNull(),
    generatedContent: text("generated_content").notNull(),
    platform: varchar("platform", { length: 32 }),
    tone: varchar("tone", { length: 32 }),
    costIncurred: decimal("cost_incurred", { precision: 10, scale: 6 }).notNull().default("0"),
    tokensUsed: integer("tokens_used").default(0),
    latencyMs: integer("latency_ms"),
    embedding: vector384("embedding"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index("content_generations_ws_idx").on(table.workspaceId),
    userIdx: index("content_generations_user_idx").on(table.userId),
    createdAtIdx: index("content_generations_created_at_idx").on(table.createdAt),
  })
);

export const contentStrategies = pgTable(
  "content_strategies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    slug: varchar("slug", { length: 64 }).notNull(),
    name: varchar("name", { length: 128 }).notNull(),
    description: text("description"),
    platform: varchar("platform", { length: 32 }).default("generic"),
    hooks: jsonb("hooks").$type<string[]>().default([]),
    captions: jsonb("captions").$type<string[]>().default([]),
    ctas: jsonb("ctas").$type<string[]>().default([]),
    templateSchema: jsonb("template_schema").$type<Record<string, unknown>>(),
    embedding: vector384("embedding"),
    isBuiltIn: boolean("is_built_in").default(false),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index("content_strategies_ws_idx").on(table.workspaceId),
  })
);

// ═══════════════════════════════════════════════════════════════════
// 4. AI CHAT & PROMPT LIBRARY
// ═══════════════════════════════════════════════════════════════════

export const promptLibrary = pgTable(
  "prompt_library",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    content: text("content").notNull(),
    category: varchar("category", { length: 64 }), // content_gen | chat | strategy
    isFavorite: boolean("is_favorite").default(false),
    usageCount: integer("usage_count").default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index("prompt_library_ws_idx").on(table.workspaceId),
    categoryIdx: index("prompt_library_category_idx").on(table.category),
  })
);

export const aiChatSessions = pgTable(
  "ai_chat_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    fanId: uuid("fan_id"),
    persona: varchar("persona", { length: 64 }),
    tone: varchar("tone", { length: 64 }),
    title: varchar("title", { length: 255 }),
    messageCount: integer("message_count").default(0),
    isArchived: boolean("is_archived").default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index("chat_sessions_ws_idx").on(table.workspaceId),
    userIdx: index("chat_sessions_user_idx").on(table.userId),
    fanIdx: index("chat_sessions_fan_idx").on(table.fanId),
  })
);

export const aiChatMessages = pgTable(
  "ai_chat_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => aiChatSessions.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 16 }).notNull(), // user | assistant | system
    content: text("content").notNull(),
    suggestedReplies: jsonb("suggested_replies").$type<string[]>().default([]),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    sessionIdx: index("chat_messages_session_idx").on(table.sessionId),
  })
);

// ═══════════════════════════════════════════════════════════════════
// 5. MEDIA LIBRARY
// ═══════════════════════════════════════════════════════════════════

export const mediaItems = pgTable(
  "media_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    type: varchar("type", { length: 32 }), // image | video | audio | document
    title: varchar("title", { length: 255 }),
    description: text("description"),
    fileSize: integer("file_size"), // bytes
    mimeType: varchar("mime_type", { length: 64 }),
    labels: jsonb("labels").$type<string[]>().default([]),
    tags: jsonb("tags").$type<string[]>().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index("media_items_ws_idx").on(table.workspaceId),
    typeIdx: index("media_items_type_idx").on(table.type),
  })
);

export const mediaLabels = pgTable(
  "media_labels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 128 }).notNull(),
    color: varchar("color", { length: 7 }).default("#06B6D4"),
  },
  (table) => ({
    workspaceNameIdx: uniqueIndex("media_labels_ws_name_idx").on(table.workspaceId, table.name),
  })
);

// ═══════════════════════════════════════════════════════════════════
// 6. FANS CRM
// ═══════════════════════════════════════════════════════════════════

export const fans = pgTable(
  "fans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }),
    handle: varchar("handle", { length: 255 }),
    platform: varchar("platform", { length: 32 }),
    platformId: varchar("platform_id", { length: 255 }),
    status: varchar("status", { length: 32 }).default("active"), // active | expired | churned | pending
    score: integer("score").default(0),
    totalSpend: decimal("total_spend", { precision: 12, scale: 2 }).default("0"),
    avgSpend: decimal("avg_spend", { precision: 12, scale: 2 }).default("0"),
    totalMessages: integer("total_messages").default(0),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
    subscribedAt: timestamp("subscribed_at", { withTimezone: true }),
    churnedAt: timestamp("churned_at", { withTimezone: true }),
    notes: text("notes"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index("fans_ws_idx").on(table.workspaceId),
    statusIdx: index("fans_status_idx").on(table.status),
    scoreIdx: index("fans_score_idx").on(table.score),
    platformIdx: index("fans_platform_idx").on(table.platform),
    handleIdx: index("fans_handle_idx").on(table.handle),
  })
);

export const fanActivityLog = pgTable(
  "fan_activity_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    fanId: uuid("fan_id")
      .notNull()
      .references(() => fans.id, { onDelete: "cascade" }),
    activityType: varchar("activity_type", { length: 64 }).notNull(), // message | purchase | view | subscribe | unsubscribe
    description: text("description"),
    value: decimal("value", { precision: 12, scale: 2 }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    fanIdx: index("fan_activity_fan_idx").on(table.fanId),
    typeIdx: index("fan_activity_type_idx").on(table.activityType),
    occurredAtIdx: index("fan_activity_occurred_at_idx").on(table.occurredAt),
  })
);

export const fanLists = pgTable(
  "fan_lists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    isDynamic: boolean("is_dynamic").default(false),
    dynamicCriteria: jsonb("dynamic_criteria")
      .$type<{
        minScore?: number;
        maxScore?: number;
        minSpend?: number;
        maxSpend?: number;
        status?: string[];
        tags?: string[];
        platforms?: string[];
        lastActiveWithinDays?: number;
      }>()
      .default({}),
    memberCount: integer("member_count").default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index("fan_lists_ws_idx").on(table.workspaceId),
  })
);

export const fanListMembers = pgTable(
  "fan_list_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listId: uuid("list_id")
      .notNull()
      .references(() => fanLists.id, { onDelete: "cascade" }),
    fanId: uuid("fan_id")
      .notNull()
      .references(() => fans.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    listFanIdx: uniqueIndex("fan_list_members_list_fan_idx").on(table.listId, table.fanId),
    fanIdx: index("fan_list_members_fan_idx").on(table.fanId),
  })
);

export const fanTags = pgTable(
  "fan_tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 128 }).notNull(),
    color: varchar("color", { length: 7 }).default("#8B5CF6"),
  },
  (table) => ({
    workspaceNameIdx: uniqueIndex("fan_tags_ws_name_idx").on(table.workspaceId, table.name),
  })
);

export const fanTagAssignments = pgTable(
  "fan_tag_assignments",
  {
    fanId: uuid("fan_id")
      .notNull()
      .references(() => fans.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => fanTags.id, { onDelete: "cascade" }),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.fanId, table.tagId] }),
  })
);

export const fanSubscriptions = pgTable(
  "fan_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    fanId: uuid("fan_id")
      .notNull()
      .references(() => fans.id, { onDelete: "cascade" }),
    tier: varchar("tier", { length: 32 }),
    price: decimal("price", { precision: 10, scale: 2 }),
    status: varchar("status", { length: 32 }).default("active"), // active | expired | cancelled
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    fanIdx: index("fan_subs_fan_idx").on(table.fanId),
    statusIdx: index("fan_subs_status_idx").on(table.status),
  })
);

// ═══════════════════════════════════════════════════════════════════
// 7. PPV CAMPAIGNS & PURCHASES
// ═══════════════════════════════════════════════════════════════════

export const ppvCampaigns = pgTable(
  "ppv_campaigns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    mediaUrl: text("media_url"),
    mediaType: varchar("media_type", { length: 32 }),
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),
    status: varchar("status", { length: 32 }).default("draft"), // draft | scheduled | sent | completed | cancelled
    targetListId: uuid("target_list_id").references(() => fanLists.id),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    totalSent: integer("total_sent").default(0),
    totalOpens: integer("total_opens").default(0),
    totalPurchases: integer("total_purchases").default(0),
    revenue: decimal("revenue", { precision: 12, scale: 2 }).default("0"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index("ppv_campaigns_ws_idx").on(table.workspaceId),
    statusIdx: index("ppv_campaigns_status_idx").on(table.status),
  })
);

export const ppvPurchases = pgTable(
  "ppv_purchases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => ppvCampaigns.id, { onDelete: "cascade" }),
    fanId: uuid("fan_id")
      .notNull()
      .references(() => fans.id, { onDelete: "cascade" }),
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),
    status: varchar("status", { length: 32 }).default("completed"), // completed | refunded | pending
    refundedAt: timestamp("refunded_at", { withTimezone: true }),
    purchasedAt: timestamp("purchased_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    campaignIdx: index("ppv_purchases_campaign_idx").on(table.campaignId),
    fanIdx: index("ppv_purchases_fan_idx").on(table.fanId),
  })
);

// ═══════════════════════════════════════════════════════════════════
// 8. AUTOMATION ENGINE
// ═══════════════════════════════════════════════════════════════════

// ── 8a. Autopilot ──
export const autopilotConfig = pgTable("autopilot_config", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" })
    .unique(),
  isEnabled: boolean("is_enabled").default(false),
  mode: varchar("mode", { length: 32 }).default("assist"), // assist | auto | off
  maxAutoRepliesPerHour: integer("max_auto_replies_per_hour").default(50),
  requireApprovalAbove: decimal("require_approval_above", { precision: 10, scale: 2 }),
  autoGreetNewFans: boolean("auto_greet_new_fans").default(false),
  autoSellPpv: boolean("auto_sell_ppv").default(false),
  greetingMessage: text("greeting_message"),
  totalAutoReplies: integer("total_auto_replies").default(0),
  revenueGenerated: decimal("revenue_generated", { precision: 12, scale: 2 }).default("0"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  updatedBy: uuid("updated_by").references(() => users.id),
});

// ── 8b. Auto Messages (Lifecycle Campaigns) ──
export const autoMessageCampaigns = pgTable(
  "auto_message_campaigns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    trigger: varchar("trigger", { length: 64 }).notNull(), // welcome | re_engage | win_back | birthday | milestone
    delayHours: integer("delay_hours").default(0),
    message: text("message").notNull(),
    includePpv: boolean("include_ppv").default(false),
    ppvCampaignId: uuid("ppv_campaign_id").references(() => ppvCampaigns.id),
    status: varchar("status", { length: 32 }).default("active"), // active | paused | completed
    totalSent: integer("total_sent").default(0),
    totalOpens: integer("total_opens").default(0),
    totalConversions: integer("total_conversions").default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index("auto_msg_campaigns_ws_idx").on(table.workspaceId),
    triggerIdx: index("auto_msg_campaigns_trigger_idx").on(table.trigger),
  })
);

// ── 8c. Conversation Flows ──
export const conversationFlows = pgTable(
  "conversation_flows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    keyword: varchar("keyword", { length: 128 }),
    graphData: jsonb("graph_data"),
    isActive: boolean("is_active").default(true),
    totalTriggered: integer("total_triggered").default(0),
    totalConversions: integer("total_conversions").default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index("conv_flows_ws_idx").on(table.workspaceId),
  })
);

export const flowSteps = pgTable(
  "flow_steps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    flowId: uuid("flow_id")
      .notNull()
      .references(() => conversationFlows.id, { onDelete: "cascade" }),
    stepOrder: integer("step_order").notNull(),
    message: text("message").notNull(),
    delayMinutes: integer("delay_minutes").default(0),
    condition: jsonb("condition").$type<{ ifResponseContains?: string; ifNoResponse?: boolean }>().default({}),
    ppvCampaignId: uuid("ppv_campaign_id").references(() => ppvCampaigns.id),
  },
  (table) => ({
    flowOrderIdx: index("flow_steps_flow_order_idx").on(table.flowId, table.stepOrder),
  })
);

// ── 8d. Keyword Triggers ──
export const keywordTriggers = pgTable(
  "keyword_triggers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 128 }).notNull(),
    keywords: jsonb("keywords").$type<string[]>().notNull(),
    response: text("response").notNull(),
    ppvCampaignId: uuid("ppv_campaign_id").references(() => ppvCampaigns.id),
    isActive: boolean("is_active").default(true),
    matchType: varchar("match_type", { length: 16 }).default("exact"), // exact | contains | regex
    totalMatches: integer("total_matches").default(0),
    totalConversions: integer("total_conversions").default(0),
    revenue: decimal("revenue", { precision: 12, scale: 2 }).default("0"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index("keyword_triggers_ws_idx").on(table.workspaceId),
    activeIdx: index("keyword_triggers_active_idx").on(table.isActive),
  })
);

// ── 8e. Message Guard ──
export const messageGuardRules = pgTable(
  "message_guard_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    word: varchar("word", { length: 128 }).notNull(),
    action: varchar("action", { length: 16 }).default("block"), // block | flag | warn
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index("msg_guard_ws_idx").on(table.workspaceId),
  })
);

// ── 8f. Bumps (Re-engagement) ──
export const bumpRules = pgTable(
  "bump_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    inactiveDays: integer("inactive_days").notNull(),
    message: text("message").notNull(),
    includePpv: boolean("include_ppv").default(false),
    ppvCampaignId: uuid("ppv_campaign_id").references(() => ppvCampaigns.id),
    isActive: boolean("is_active").default(true),
    maxBumpsPerFan: integer("max_bumps_per_fan").default(3),
    cooldownDays: integer("cooldown_days").default(7),
    totalSent: integer("total_sent").default(0),
    reEngaged: integer("re_engaged").default(0),
    revenueRecovered: decimal("revenue_recovered", { precision: 12, scale: 2 }).default("0"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index("bump_rules_ws_idx").on(table.workspaceId),
  })
);

export const bumpSent = pgTable(
  "bump_sent",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bumpRuleId: uuid("bump_rule_id")
      .notNull()
      .references(() => bumpRules.id, { onDelete: "cascade" }),
    fanId: uuid("fan_id")
      .notNull()
      .references(() => fans.id, { onDelete: "cascade" }),
    sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow().notNull(),
    responded: boolean("responded").default(false),
    purchased: boolean("purchased").default(false),
  },
  (table) => ({
    ruleFanIdx: index("bump_sent_rule_fan_idx").on(table.bumpRuleId, table.fanId),
  })
);

// ── 8g. Broadcasts ──
export const broadcastCampaigns = pgTable(
  "broadcast_campaigns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    message: text("message").notNull(),
    includePpv: boolean("include_ppv").default(false),
    ppvCampaignId: uuid("ppv_campaign_id").references(() => ppvCampaigns.id),
    targetListId: uuid("target_list_id").references(() => fanLists.id),
    personalizationFields: jsonb("personalization_fields").$type<string[]>().default([]),
    status: varchar("status", { length: 32 }).default("draft"), // draft | scheduled | sending | sent | completed
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    totalTargeted: integer("total_targeted").default(0),
    totalDelivered: integer("total_delivered").default(0),
    totalOpens: integer("total_opens").default(0),
    totalConversions: integer("total_conversions").default(0),
    revenue: decimal("revenue", { precision: 12, scale: 2 }).default("0"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index("broadcast_campaigns_ws_idx").on(table.workspaceId),
    statusIdx: index("broadcast_campaigns_status_idx").on(table.status),
  })
);

export const broadcastRecipients = pgTable(
  "broadcast_recipients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => broadcastCampaigns.id, { onDelete: "cascade" }),
    fanId: uuid("fan_id")
      .notNull()
      .references(() => fans.id, { onDelete: "cascade" }),
    delivered: boolean("delivered").default(false),
    openedAt: timestamp("opened_at", { withTimezone: true }),
    purchased: boolean("purchased").default(false),
    revenue: decimal("revenue", { precision: 12, scale: 2 }).default("0"),
  },
  (table) => ({
    campaignIdx: index("broadcast_recipients_campaign_idx").on(table.campaignId),
    fanIdx: index("broadcast_recipients_fan_idx").on(table.fanId),
  })
);

// ── 8h. Social Funnels ──
export const socialFunnels = pgTable(
  "social_funnels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    platform: varchar("platform", { length: 32 }).notNull(), // instagram | twitter | tiktok
    trigger: varchar("trigger", { length: 64 }).notNull(), // comment | reply | mention | dm
    keywords: jsonb("keywords").$type<string[]>().default([]),
    autoDmMessage: text("auto_dm_message").notNull(),
    isActive: boolean("is_active").default(true),
    totalTriggered: integer("total_triggered").default(0),
    totalConverted: integer("total_converted").default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index("social_funnels_ws_idx").on(table.workspaceId),
    platformIdx: index("social_funnels_platform_idx").on(table.platform),
  })
);

// ── 8i. Onboarding Funnels ──
export const onboardingFunnels = pgTable(
  "onboarding_funnels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    isActive: boolean("is_active").default(true),
    totalTriggered: integer("total_triggered").default(0),
    totalConverted: integer("total_converted").default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index("onboarding_funnels_ws_idx").on(table.workspaceId),
  })
);

export const onboardingFunnelSteps = pgTable(
  "onboarding_funnel_steps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    funnelId: uuid("funnel_id")
      .notNull()
      .references(() => onboardingFunnels.id, { onDelete: "cascade" }),
    stepOrder: integer("step_order").notNull(),
    delayHours: integer("delay_hours").default(0),
    message: text("message").notNull(),
    ppvCampaignId: uuid("ppv_campaign_id").references(() => ppvCampaigns.id),
  },
  (table) => ({
    funnelOrderIdx: index("onboarding_steps_funnel_order_idx").on(table.funnelId, table.stepOrder),
  })
);

// ═══════════════════════════════════════════════════════════════════
// 9. TEAM OPERATIONS
// ═══════════════════════════════════════════════════════════════════

export const chatterShifts = pgTable(
  "chatter_shifts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    chatterId: uuid("chatter_id")
      .notNull()
      .references(() => users.id),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    totalMessages: integer("total_messages").default(0),
    totalPpvSent: integer("total_ppv_sent").default(0),
    totalPurchases: integer("total_purchases").default(0),
    conversionRate: decimal("conversion_rate", { precision: 5, scale: 2 }).default("0"),
    revenue: decimal("revenue", { precision: 12, scale: 2 }).default("0"),
    avgResponseTime: integer("avg_response_time"), // seconds
    notes: text("notes"),
  },
  (table) => ({
    workspaceIdx: index("chatter_shifts_ws_idx").on(table.workspaceId),
    chatterIdx: index("chatter_shifts_chatter_idx").on(table.chatterId),
    startedAtIdx: index("chatter_shifts_started_at_idx").on(table.startedAt),
  })
);

export const shiftSchedules = pgTable(
  "shift_schedules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    dayOfWeek: integer("day_of_week").notNull(), // 0=Monday, 6=Sunday
    startTime: varchar("start_time", { length: 5 }).notNull(), // "09:00"
    endTime: varchar("end_time", { length: 5 }).notNull(), // "17:00"
    timezone: varchar("timezone", { length: 64 }).default("UTC"),
    isRecurring: boolean("is_recurring").default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index("shift_schedules_ws_idx").on(table.workspaceId),
    userDayIdx: index("shift_schedules_user_day_idx").on(table.userId, table.dayOfWeek),
  })
);

// ═══════════════════════════════════════════════════════════════════
// 10. TRAFFIC ATTRIBUTION
// ═══════════════════════════════════════════════════════════════════

export const trafficSources = pgTable(
  "traffic_sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    url: text("url"),
    platform: varchar("platform", { length: 64 }),
    utmSource: varchar("utm_source", { length: 128 }),
    utmMedium: varchar("utm_medium", { length: 128 }),
    utmCampaign: varchar("utm_campaign", { length: 128 }),
    trackingCode: varchar("tracking_code", { length: 64 }),
    isActive: boolean("is_active").default(true),
    totalClicks: integer("total_clicks").default(0),
    totalSubscriptions: integer("total_subscriptions").default(0),
    totalRevenue: decimal("total_revenue", { precision: 12, scale: 2 }).default("0"),
    roi: decimal("roi", { precision: 8, scale: 2 }).default("0"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index("traffic_sources_ws_idx").on(table.workspaceId),
    trackingCodeIdx: uniqueIndex("traffic_sources_code_idx").on(table.trackingCode),
  })
);

export const trafficClicks = pgTable(
  "traffic_clicks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => trafficSources.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    referrer: text("referrer"),
    convertedToFan: boolean("converted_to_fan").default(false),
    fanId: uuid("fan_id").references(() => fans.id),
    revenue: decimal("revenue", { precision: 12, scale: 2 }).default("0"),
    clickedAt: timestamp("clicked_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    sourceIdx: index("traffic_clicks_source_idx").on(table.sourceId),
    workspaceIdx: index("traffic_clicks_ws_idx").on(table.workspaceId),
    clickedAtIdx: index("traffic_clicks_clicked_at_idx").on(table.clickedAt),
  })
);

// ═══════════════════════════════════════════════════════════════════
// 11. BILLING & SUBSCRIPTIONS
// ═══════════════════════════════════════════════════════════════════

export const subscriptionPlans = pgTable(
  "subscription_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 64 }).notNull(),
    name: varchar("name", { length: 128 }).notNull(),
    price: decimal("price", { precision: 8, scale: 2 }).notNull(),
    aiGenerationsLimit: integer("ai_generations_limit").notNull(),
    socialPlatforms: integer("social_platforms").notNull().default(1),
    seats: integer("seats").notNull().default(1),
    hasAdvancedAnalytics: boolean("has_advanced_analytics").default(false),
    hasApiAccess: boolean("has_api_access").default(false),
    hasPrioritySupport: boolean("has_priority_support").default(false),
    hasTeamManagement: boolean("has_team_management").default(false),
    features: jsonb("features").$type<string[]>().default([]),
    isActive: boolean("is_active").default(true),
    sortOrder: integer("sort_order").default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    slugIdx: uniqueIndex("subscription_plans_slug_idx").on(table.slug),
    activeIdx: index("subscription_plans_active_idx").on(table.isActive),
  })
);

export const workspaceSubscriptions = pgTable(
  "workspace_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" })
      .unique(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => subscriptionPlans.id),
    status: varchar("status", { length: 32 }).default("trialing"), // active | trialing | past_due | canceled | expired
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }).notNull(),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }).notNull(),
    canceledAt: timestamp("canceled_at", { withTimezone: true }),
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
    stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
    stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    statusIdx: index("workspace_subs_status_idx").on(table.status),
    planIdx: index("workspace_subs_plan_idx").on(table.planId),
  })
);

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    subscriptionId: uuid("subscription_id")
      .notNull()
      .references(() => workspaceSubscriptions.id),
    stripeInvoiceId: varchar("stripe_invoice_id", { length: 255 }),
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).default("usd"),
    status: varchar("status", { length: 32 }).default("pending"), // pending | paid | overdue | canceled
    paidAt: timestamp("paid_at", { withTimezone: true }),
    dueDate: timestamp("due_date", { withTimezone: true }),
    invoiceUrl: text("invoice_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index("invoices_ws_idx").on(table.workspaceId),
    statusIdx: index("invoices_status_idx").on(table.status),
  })
);

export const usageRecords = pgTable(
  "usage_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    recordType: varchar("record_type", { length: 32 }).notNull(), // ai_generation | api_call | storage
    quantity: integer("quantity").default(1),
    cost: decimal("cost", { precision: 10, scale: 6 }).default("0"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index("usage_records_ws_idx").on(table.workspaceId),
    typeIdx: index("usage_records_type_idx").on(table.recordType),
    recordedAtIdx: index("usage_records_recorded_at_idx").on(table.recordedAt),
  })
);

// ═══════════════════════════════════════════════════════════════════
// 12. ANALYTICS & AUDIT
// ═══════════════════════════════════════════════════════════════════

export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    sessionId: uuid("session_id"),
    eventType: varchar("event_type", { length: 64 }).notNull(),
    eventName: varchar("event_name", { length: 128 }),
    pagePath: varchar("page_path", { length: 512 }),
    referrer: text("referrer"),
    userAgent: text("user_agent"),
    ipAddress: varchar("ip_address", { length: 45 }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    value: decimal("value", { precision: 12, scale: 4 }),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index("analytics_events_ws_idx").on(table.workspaceId),
    eventTypeIdx: index("analytics_events_type_idx").on(table.eventType),
    occurredAtIdx: index("analytics_events_occurred_at_idx").on(table.occurredAt),
  })
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    action: varchar("action", { length: 64 }).notNull(),
    resourceType: varchar("resource_type", { length: 64 }),
    resourceId: uuid("resource_id"),
    details: jsonb("details").$type<Record<string, unknown>>().default({}),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    severity: varchar("severity", { length: 16 }).default("info"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index("audit_logs_ws_idx").on(table.workspaceId),
    actionIdx: index("audit_logs_action_idx").on(table.action),
    createdAtIdx: index("audit_logs_created_at_idx").on(table.createdAt),
  })
);

// ═══════════════════════════════════════════════════════════════════
// 13. ROLE PERMISSIONS MATRIX
// ═══════════════════════════════════════════════════════════════════

export const rolePermissions = pgTable(
  "role_permissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 32 }).notNull(), // owner | admin | editor | chatter
    resource: varchar("resource", { length: 64 }).notNull(),
    action: varchar("action", { length: 32 }).notNull(),
    isAllowed: boolean("is_allowed").default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    roleResourceActionIdx: uniqueIndex("role_perms_role_resource_action_idx").on(
      table.workspaceId,
      table.role,
      table.resource,
      table.action
    ),
  })
);
