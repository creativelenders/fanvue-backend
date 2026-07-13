-- Initial Fanvue Promotion OS schema.
-- Apply this to PostgreSQL before running production workers.

CREATE TABLE IF NOT EXISTS workspaces (
  id VARCHAR(80) PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  plan VARCHAR(40) NOT NULL DEFAULT 'internal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS operator_users (
  id VARCHAR(80) PRIMARY KEY,
  workspace_id VARCHAR(80) NOT NULL REFERENCES workspaces(id),
  email VARCHAR(240) NOT NULL,
  role VARCHAR(40) NOT NULL DEFAULT 'operator',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscribers (
  uuid VARCHAR(80) PRIMARY KEY,
  status VARCHAR(40) NOT NULL DEFAULT 'active',
  total_spend_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
  vip_tier BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS message_events (
  id SERIAL PRIMARY KEY,
  subscriber_uuid VARCHAR(80) NOT NULL,
  text TEXT NOT NULL DEFAULT '',
  media_json TEXT NOT NULL DEFAULT '[]',
  ppv_price_usd DOUBLE PRECISION,
  purchased_at TIMESTAMPTZ,
  sent_by_user_id VARCHAR(80),
  attribution_source VARCHAR(40) NOT NULL DEFAULT 'AI_AGENT',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_events (
  id SERIAL PRIMARY KEY,
  subscriber_uuid VARCHAR(80) NOT NULL,
  amount_usd DOUBLE PRECISION NOT NULL,
  kind VARCHAR(40) NOT NULL,
  fanvue_payment_id VARCHAR(120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaigns (
  id VARCHAR(80) PRIMARY KEY,
  workspace_id VARCHAR(80) NOT NULL REFERENCES workspaces(id),
  name VARCHAR(180) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'draft',
  objective VARCHAR(120) NOT NULL DEFAULT 'conversion',
  audience TEXT NOT NULL DEFAULT '',
  offer TEXT NOT NULL DEFAULT '',
  channels_json TEXT NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS media_generation_jobs (
  id VARCHAR(80) PRIMARY KEY,
  workspace_id VARCHAR(80) NOT NULL REFERENCES workspaces(id),
  campaign_id VARCHAR(80),
  prompt TEXT NOT NULL,
  seed INTEGER NOT NULL,
  lora_name VARCHAR(160) NOT NULL,
  lora_strength DOUBLE PRECISION NOT NULL DEFAULT 0.78,
  ppv_price_usd DOUBLE PRECISION NOT NULL DEFAULT 15,
  status VARCHAR(40) NOT NULL DEFAULT 'queued',
  result_json TEXT NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS approval_items (
  id VARCHAR(80) PRIMARY KEY,
  workspace_id VARCHAR(80) NOT NULL REFERENCES workspaces(id),
  kind VARCHAR(60) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'pending',
  title VARCHAR(200) NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  workspace_id VARCHAR(80) NOT NULL,
  actor_user_id VARCHAR(80) NOT NULL,
  action VARCHAR(120) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id VARCHAR(120),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_workspace ON campaigns(workspace_id);
CREATE INDEX IF NOT EXISTS idx_media_jobs_workspace_status ON media_generation_jobs(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_approvals_workspace_status ON approval_items(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_subscribers_vip ON subscribers(vip_tier);
CREATE INDEX IF NOT EXISTS idx_message_events_subscriber ON message_events(subscriber_uuid);
CREATE INDEX IF NOT EXISTS idx_audit_workspace ON audit_logs(workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS scheduled_dispatches (
  id VARCHAR(80) PRIMARY KEY,
  workspace_id VARCHAR(80) NOT NULL,
  subscriber_uuid VARCHAR(80) NOT NULL,
  kind VARCHAR(60) NOT NULL DEFAULT 'vip_checkin',
  status VARCHAR(40) NOT NULL DEFAULT 'queued',
  message TEXT NOT NULL,
  ppv_price_usd DOUBLE PRECISION,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS generated_creator_interactions (
  id VARCHAR(80) PRIMARY KEY,
  workspace_id VARCHAR(80) NOT NULL,
  subscriber_uuid VARCHAR(80),
  persona_id VARCHAR(80) NOT NULL,
  prompt TEXT NOT NULL DEFAULT '',
  response TEXT NOT NULL DEFAULT '',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS thermonuclear_audit_logs (
  id VARCHAR(80) PRIMARY KEY,
  workspace_id VARCHAR(80) NOT NULL,
  score INTEGER NOT NULL,
  sampled_count INTEGER NOT NULL DEFAULT 0,
  persona_drift_count INTEGER NOT NULL DEFAULT 0,
  guardrail_failure_count INTEGER NOT NULL DEFAULT 0,
  missed_monetization_count INTEGER NOT NULL DEFAULT 0,
  scorecard_json TEXT NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dispatches_workspace_status ON scheduled_dispatches(workspace_id, status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_interactions_workspace_created ON generated_creator_interactions(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_persona_created ON generated_creator_interactions(persona_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_workspace_created ON thermonuclear_audit_logs(workspace_id, created_at DESC);
