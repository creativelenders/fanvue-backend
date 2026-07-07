import { relations } from "drizzle-orm";
import {
  workspaces,
  workspaceMembers,
  workspaceInvitations,
  users,
  sessions,
  userApiKeys,
  userPreferences,
  contentDrafts,
  aiModels,
  contentGenerations,
  contentStrategies,
  promptLibrary,
  aiChatSessions,
  aiChatMessages,
  mediaItems,
  mediaLabels,
  fans,
  fanActivityLog,
  fanLists,
  fanListMembers,
  fanTags,
  fanTagAssignments,
  fanSubscriptions,
  ppvCampaigns,
  ppvPurchases,
  autopilotConfig,
  autoMessageCampaigns,
  conversationFlows,
  flowSteps,
  keywordTriggers,
  messageGuardRules,
  bumpRules,
  bumpSent,
  broadcastCampaigns,
  broadcastRecipients,
  socialFunnels,
  onboardingFunnels,
  onboardingFunnelSteps,
  chatterShifts,
  shiftSchedules,
  trafficSources,
  trafficClicks,
  subscriptionPlans,
  workspaceSubscriptions,
  invoices,
  usageRecords,
  analyticsEvents,
  auditLogs,
  rolePermissions,
} from "./index";

// ─── 1. TENANCY ───
export const workspacesRelations = relations(workspaces, ({ many }) => ({
  members: many(workspaceMembers),
  invitations: many(workspaceInvitations),
  sessions: many(sessions),
  apiKeys: many(userApiKeys),
  contentDrafts: many(contentDrafts),
  contentGenerations: many(contentGenerations),
  contentStrategies: many(contentStrategies),
  promptLibrary: many(promptLibrary),
  aiChatSessions: many(aiChatSessions),
  mediaItems: many(mediaItems),
  mediaLabels: many(mediaLabels),
  fans: many(fans),
  fanActivityLogs: many(fanActivityLog),
  fanLists: many(fanLists),
  fanTags: many(fanTags),
  fanSubscriptions: many(fanSubscriptions),
  ppvCampaigns: many(ppvCampaigns),
  ppvPurchases: many(ppvPurchases),
  autoMessageCampaigns: many(autoMessageCampaigns),
  conversationFlows: many(conversationFlows),
  keywordTriggers: many(keywordTriggers),
  messageGuardRules: many(messageGuardRules),
  bumpRules: many(bumpRules),
  broadcastCampaigns: many(broadcastCampaigns),
  socialFunnels: many(socialFunnels),
  onboardingFunnels: many(onboardingFunnels),
  chatterShifts: many(chatterShifts),
  shiftSchedules: many(shiftSchedules),
  trafficSources: many(trafficSources),
  trafficClicks: many(trafficClicks),
  invoices: many(invoices),
  usageRecords: many(usageRecords),
  analyticsEvents: many(analyticsEvents),
  auditLogs: many(auditLogs),
  rolePermissions: many(rolePermissions),
}));

export const workspaceMembersRelations = relations(workspaceMembers, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspaceMembers.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [workspaceMembers.userId],
    references: [users.id],
  }),
  invitedByUser: one(users, {
    fields: [workspaceMembers.invitedBy],
    references: [users.id],
  }),
}));

export const workspaceInvitationsRelations = relations(workspaceInvitations, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspaceInvitations.workspaceId],
    references: [workspaces.id],
  }),
}));

// ─── 2. USERS & AUTH ───
export const usersRelations = relations(users, ({ many, one }) => ({
  defaultWorkspace: one(workspaces, {
    fields: [users.defaultWorkspaceId],
    references: [workspaces.id],
  }),
  workspaceMembers: many(workspaceMembers),
  sessions: many(sessions),
  apiKeys: many(userApiKeys),
  preferences: one(userPreferences, {
    fields: [users.id],
    references: [userPreferences.userId],
  }),
  contentDrafts: many(contentDrafts),
  contentGenerations: many(contentGenerations),
  contentStrategies: many(contentStrategies),
  promptLibrary: many(promptLibrary),
  aiChatSessions: many(aiChatSessions),
  mediaItems: many(mediaItems),
  ppvCampaigns: many(ppvCampaigns),
  broadcastCampaigns: many(broadcastCampaigns),
  chatterShifts: many(chatterShifts),
  shiftSchedules: many(shiftSchedules),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
  workspace: one(workspaces, {
    fields: [sessions.workspaceId],
    references: [workspaces.id],
  }),
}));

export const userApiKeysRelations = relations(userApiKeys, ({ one }) => ({
  user: one(users, {
    fields: [userApiKeys.userId],
    references: [users.id],
  }),
  workspace: one(workspaces, {
    fields: [userApiKeys.workspaceId],
    references: [workspaces.id],
  }),
}));

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(users, {
    fields: [userPreferences.userId],
    references: [users.id],
  }),
}));

// ─── 3. CONTENT ───
export const contentDraftsRelations = relations(contentDrafts, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [contentDrafts.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [contentDrafts.userId],
    references: [users.id],
  }),
  generations: many(contentGenerations),
}));

export const aiModelsRelations = relations(aiModels, ({ many }) => ({
  contentGenerations: many(contentGenerations),
}));

export const contentGenerationsRelations = relations(contentGenerations, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [contentGenerations.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [contentGenerations.userId],
    references: [users.id],
  }),
  aiModel: one(aiModels, {
    fields: [contentGenerations.aiModelId],
    references: [aiModels.id],
  }),
  draft: one(contentDrafts, {
    fields: [contentGenerations.draftId],
    references: [contentDrafts.id],
  }),
}));

export const contentStrategiesRelations = relations(contentStrategies, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [contentStrategies.workspaceId],
    references: [workspaces.id],
  }),
  creator: one(users, {
    fields: [contentStrategies.createdBy],
    references: [users.id],
  }),
}));

// ─── 4. AI CHAT ───
export const promptLibraryRelations = relations(promptLibrary, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [promptLibrary.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [promptLibrary.userId],
    references: [users.id],
  }),
}));

export const aiChatSessionsRelations = relations(aiChatSessions, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [aiChatSessions.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [aiChatSessions.userId],
    references: [users.id],
  }),
  fan: one(fans, {
    fields: [aiChatSessions.fanId],
    references: [fans.id],
  }),
  messages: many(aiChatMessages),
}));

export const aiChatMessagesRelations = relations(aiChatMessages, ({ one }) => ({
  session: one(aiChatSessions, {
    fields: [aiChatMessages.sessionId],
    references: [aiChatSessions.id],
  }),
}));

// ─── 5. MEDIA LIBRARY ───
export const mediaItemsRelations = relations(mediaItems, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [mediaItems.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [mediaItems.userId],
    references: [users.id],
  }),
}));

export const mediaLabelsRelations = relations(mediaLabels, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [mediaLabels.workspaceId],
    references: [workspaces.id],
  }),
}));

// ─── 6. FANS CRM ───
export const fansRelations = relations(fans, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [fans.workspaceId],
    references: [workspaces.id],
  }),
  activities: many(fanActivityLog),
  listMemberships: many(fanListMembers),
  tags: many(fanTagAssignments),
  subscriptions: many(fanSubscriptions),
  chatSessions: many(aiChatSessions),
  purchases: many(ppvPurchases),
  bumps: many(bumpSent),
  broadcastsReceived: many(broadcastRecipients),
  trafficClicks: many(trafficClicks),
}));

export const fanActivityLogRelations = relations(fanActivityLog, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [fanActivityLog.workspaceId],
    references: [workspaces.id],
  }),
  fan: one(fans, {
    fields: [fanActivityLog.fanId],
    references: [fans.id],
  }),
}));

export const fanListsRelations = relations(fanLists, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [fanLists.workspaceId],
    references: [workspaces.id],
  }),
  members: many(fanListMembers),
  ppvCampaigns: many(ppvCampaigns),
  broadcastCampaigns: many(broadcastCampaigns),
}));

export const fanListMembersRelations = relations(fanListMembers, ({ one }) => ({
  list: one(fanLists, {
    fields: [fanListMembers.listId],
    references: [fanLists.id],
  }),
  fan: one(fans, {
    fields: [fanListMembers.fanId],
    references: [fans.id],
  }),
}));

export const fanTagsRelations = relations(fanTags, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [fanTags.workspaceId],
    references: [workspaces.id],
  }),
  assignments: many(fanTagAssignments),
}));

export const fanTagAssignmentsRelations = relations(fanTagAssignments, ({ one }) => ({
  fan: one(fans, {
    fields: [fanTagAssignments.fanId],
    references: [fans.id],
  }),
  tag: one(fanTags, {
    fields: [fanTagAssignments.tagId],
    references: [fanTags.id],
  }),
}));

export const fanSubscriptionsRelations = relations(fanSubscriptions, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [fanSubscriptions.workspaceId],
    references: [workspaces.id],
  }),
  fan: one(fans, {
    fields: [fanSubscriptions.fanId],
    references: [fans.id],
  }),
}));

// ─── 7. PPV ───
export const ppvCampaignsRelations = relations(ppvCampaigns, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [ppvCampaigns.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [ppvCampaigns.userId],
    references: [users.id],
  }),
  targetList: one(fanLists, {
    fields: [ppvCampaigns.targetListId],
    references: [fanLists.id],
  }),
  purchases: many(ppvPurchases),
  autoMessageCampaigns: many(autoMessageCampaigns),
  flowSteps: many(flowSteps),
  keywordTriggers: many(keywordTriggers),
  bumpRules: many(bumpRules),
  broadcastCampaigns: many(broadcastCampaigns),
  onboardingFunnelSteps: many(onboardingFunnelSteps),
}));

export const ppvPurchasesRelations = relations(ppvPurchases, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [ppvPurchases.workspaceId],
    references: [workspaces.id],
  }),
  campaign: one(ppvCampaigns, {
    fields: [ppvPurchases.campaignId],
    references: [ppvCampaigns.id],
  }),
  fan: one(fans, {
    fields: [ppvPurchases.fanId],
    references: [fans.id],
  }),
}));

// ─── 8. AUTOMATION ENGINE ───
export const autopilotConfigRelations = relations(autopilotConfig, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [autopilotConfig.workspaceId],
    references: [workspaces.id],
  }),
  updatedByUser: one(users, {
    fields: [autopilotConfig.updatedBy],
    references: [users.id],
  }),
}));

export const autoMessageCampaignsRelations = relations(autoMessageCampaigns, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [autoMessageCampaigns.workspaceId],
    references: [workspaces.id],
  }),
  ppvCampaign: one(ppvCampaigns, {
    fields: [autoMessageCampaigns.ppvCampaignId],
    references: [ppvCampaigns.id],
  }),
}));

export const conversationFlowsRelations = relations(conversationFlows, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [conversationFlows.workspaceId],
    references: [workspaces.id],
  }),
  steps: many(flowSteps),
}));

export const flowStepsRelations = relations(flowSteps, ({ one }) => ({
  flow: one(conversationFlows, {
    fields: [flowSteps.flowId],
    references: [conversationFlows.id],
  }),
  ppvCampaign: one(ppvCampaigns, {
    fields: [flowSteps.ppvCampaignId],
    references: [ppvCampaigns.id],
  }),
}));

export const keywordTriggersRelations = relations(keywordTriggers, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [keywordTriggers.workspaceId],
    references: [workspaces.id],
  }),
  ppvCampaign: one(ppvCampaigns, {
    fields: [keywordTriggers.ppvCampaignId],
    references: [ppvCampaigns.id],
  }),
}));

export const messageGuardRulesRelations = relations(messageGuardRules, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [messageGuardRules.workspaceId],
    references: [workspaces.id],
  }),
}));

export const bumpRulesRelations = relations(bumpRules, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [bumpRules.workspaceId],
    references: [workspaces.id],
  }),
  ppvCampaign: one(ppvCampaigns, {
    fields: [bumpRules.ppvCampaignId],
    references: [ppvCampaigns.id],
  }),
  bumpsSent: many(bumpSent),
}));

export const bumpSentRelations = relations(bumpSent, ({ one }) => ({
  rule: one(bumpRules, {
    fields: [bumpSent.bumpRuleId],
    references: [bumpRules.id],
  }),
  fan: one(fans, {
    fields: [bumpSent.fanId],
    references: [fans.id],
  }),
}));

export const broadcastCampaignsRelations = relations(broadcastCampaigns, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [broadcastCampaigns.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [broadcastCampaigns.userId],
    references: [users.id],
  }),
  ppvCampaign: one(ppvCampaigns, {
    fields: [broadcastCampaigns.ppvCampaignId],
    references: [ppvCampaigns.id],
  }),
  targetList: one(fanLists, {
    fields: [broadcastCampaigns.targetListId],
    references: [fanLists.id],
  }),
  recipients: many(broadcastRecipients),
}));

export const broadcastRecipientsRelations = relations(broadcastRecipients, ({ one }) => ({
  campaign: one(broadcastCampaigns, {
    fields: [broadcastRecipients.campaignId],
    references: [broadcastCampaigns.id],
  }),
  fan: one(fans, {
    fields: [broadcastRecipients.fanId],
    references: [fans.id],
  }),
}));

export const socialFunnelsRelations = relations(socialFunnels, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [socialFunnels.workspaceId],
    references: [workspaces.id],
  }),
}));

export const onboardingFunnelsRelations = relations(onboardingFunnels, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [onboardingFunnels.workspaceId],
    references: [workspaces.id],
  }),
  steps: many(onboardingFunnelSteps),
}));

export const onboardingFunnelStepsRelations = relations(onboardingFunnelSteps, ({ one }) => ({
  funnel: one(onboardingFunnels, {
    fields: [onboardingFunnelSteps.funnelId],
    references: [onboardingFunnels.id],
  }),
  ppvCampaign: one(ppvCampaigns, {
    fields: [onboardingFunnelSteps.ppvCampaignId],
    references: [ppvCampaigns.id],
  }),
}));

// ─── 9. TEAM OPERATIONS ───
export const chatterShiftsRelations = relations(chatterShifts, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [chatterShifts.workspaceId],
    references: [workspaces.id],
  }),
  chatter: one(users, {
    fields: [chatterShifts.chatterId],
    references: [users.id],
  }),
}));

export const shiftSchedulesRelations = relations(shiftSchedules, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [shiftSchedules.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [shiftSchedules.userId],
    references: [users.id],
  }),
}));

// ─── 10. TRAFFIC ───
export const trafficSourcesRelations = relations(trafficSources, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [trafficSources.workspaceId],
    references: [workspaces.id],
  }),
  clicks: many(trafficClicks),
}));

export const trafficClicksRelations = relations(trafficClicks, ({ one }) => ({
  source: one(trafficSources, {
    fields: [trafficClicks.sourceId],
    references: [trafficSources.id],
  }),
  workspace: one(workspaces, {
    fields: [trafficClicks.workspaceId],
    references: [workspaces.id],
  }),
  fan: one(fans, {
    fields: [trafficClicks.fanId],
    references: [fans.id],
  }),
}));

// ─── 11. BILLING ───
export const subscriptionPlansRelations = relations(subscriptionPlans, ({ many }) => ({
  subscriptions: many(workspaceSubscriptions),
}));

export const workspaceSubscriptionsRelations = relations(workspaceSubscriptions, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [workspaceSubscriptions.workspaceId],
    references: [workspaces.id],
  }),
  plan: one(subscriptionPlans, {
    fields: [workspaceSubscriptions.planId],
    references: [subscriptionPlans.id],
  }),
  invoices: many(invoices),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [invoices.workspaceId],
    references: [workspaces.id],
  }),
  subscription: one(workspaceSubscriptions, {
    fields: [invoices.subscriptionId],
    references: [workspaceSubscriptions.id],
  }),
}));

export const usageRecordsRelations = relations(usageRecords, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [usageRecords.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [usageRecords.userId],
    references: [users.id],
  }),
}));

// ─── 12. ANALYTICS & AUDIT ───
export const analyticsEventsRelations = relations(analyticsEvents, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [analyticsEvents.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [analyticsEvents.userId],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [auditLogs.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

// ─── 13. RBAC ───
export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [rolePermissions.workspaceId],
    references: [workspaces.id],
  }),
}));
