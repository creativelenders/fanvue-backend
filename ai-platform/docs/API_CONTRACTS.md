# API Contracts

## Platform context headers

```text
x-workspace-id: <workspace id>
x-user-id: <operator id>
x-user-role: owner|admin|operator|viewer
```

## Dashboard

```text
GET /platform/dashboard
```

Response:

```json
{
  "campaigns": 0,
  "media_jobs": 0,
  "pending_approvals": 0
}
```

## Campaigns

```text
POST /platform/campaigns
GET /platform/campaigns
```

Create payload:

```json
{
  "name": "July VIP Push",
  "objective": "conversion",
  "audience": "VIP fans",
  "offer": "Renewal bundle",
  "channels": ["fanvue", "x", "email"]
}
```

## Media jobs

```text
POST /platform/media/jobs
GET /platform/media/jobs
```

Create payload:

```json
{
  "campaign_id": "camp_...",
  "prompt": "vertical teaser concept",
  "seed": 123,
  "lora_name": "creator_lora",
  "lora_strength": 0.78,
  "ppv_price_usd": 15
}
```

## Fanvue webhooks

```text
POST /webhooks/fanvue
```

Supported event types:

- `creator.subscription.activated`
- `creator.message.received`
- `creator.payment.succeeded`

## Scheduled dispatches and audit logs

Worker-generated CRM messages are queued in `scheduled_dispatches`.

Nightly QA scorecards are saved in `thermonuclear_audit_logs` with counts for:

- persona drift
- guardrail failures
- missed monetization triggers
