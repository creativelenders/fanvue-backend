export type DashboardSummary = {
  campaigns: number;
  media_jobs: number;
  pending_approvals: number;
};

export type Campaign = {
  id: string;
  name: string;
  status: "draft" | "scheduled" | "active" | "paused" | "complete" | string;
  objective: string;
  channels: string[];
};

export type MediaJob = {
  id: string;
  campaign_id: string | null;
  status: "queued" | "running" | "complete" | "failed" | string;
  seed: number;
  ppv_price_usd: number;
};

export type ApprovalItem = {
  id: string;
  kind: "chat" | "media" | "campaign" | "system" | string;
  title: string;
  status: "pending" | "approved" | "rejected" | string;
};

export type FanvueWebhookType =
  | "creator.subscription.activated"
  | "creator.message.received"
  | "creator.payment.succeeded";

export type VariantGenerationRequest = {
  prompt: string;
  seed: number;
  lora_name: string;
  lora_strength: number;
  ppv_price_usd: number;
  campaign_id?: string;
};

