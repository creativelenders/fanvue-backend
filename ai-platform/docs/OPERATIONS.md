# Operations Runbook

## Processes

- API: `uvicorn app.main:app --host 0.0.0.0 --port 8000`
- Web: Next.js app on port 3000
- CRM worker: scans expiring subscriptions and prepares retention actions
- Media worker: processes queued media jobs through ComfyUI
- Scheduler: triggers periodic audits and content funnel routines

## OmniRoute / Hermes routing

Set:

```text
OMNIROUTE_BASE_URL=http://localhost:20128/v1
OMNIROUTE_API_KEY=<gateway token>
OMNIROUTE_TTS_URL=http://localhost:20128/v1/audio/speech
HERMES_MODEL=Nous-Hermes-3
CONTEXT_COMPRESSION_URL=<optional search context compression endpoint>
```

Workers use combo headers:

- CRM VIP batch: `X-OmniRoute-Combo: cost-optimized`
- Thermonuclear QA: `X-OmniRoute-Combo: priority-thermonuclear`

## Health checks

- API: `GET /health`
- Skills: `GET /skills`
- Platform dashboard: `GET /platform/dashboard`

## Webhook verification

If `FANVUE_WEBHOOK_SECRET` is set, incoming webhook requests must include:

```text
x-fanvue-signature: sha256=<hmac-sha256-body>
```

## Human review

Guardrails route sensitive chat drafts to approval rather than sending automatically. Sensitive triggers include refunds, legal issues, safety concerns, private information, and complex account requests.
