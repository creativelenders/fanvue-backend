-- Durable webhook receipt log. Apply before enabling Fanvue webhooks in production.
CREATE TABLE IF NOT EXISTS webhook_events (
  provider_event_id VARCHAR(160) PRIMARY KEY,
  event_type VARCHAR(120) NOT NULL,
  payload_json TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_webhook_events_received_at ON webhook_events(received_at DESC);
