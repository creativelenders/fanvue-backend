# Fanvue Promotion OS Backend

FastAPI backend implementation for the expanded platform:

- `OpenModelLoopEngine`: async ReAct coding loops, git checkpoints, rollback, learning loop, review council, enterprise scoring, and workflow meta-optimization.
- `SparkSkillRegistry`: Markdown SOP loading and `@skill` / `/skill` prompt injection.
- Fanvue CRM webhooks: subscription activation, messages, payments, PPV release verification, attribution, VIP segmentation, and churn-prevention scan logic.
- Content pipeline: ComfyUI-compatible dual-variant teaser/unlock generation with LoRA strength enforcement and image-to-video workflow construction.
- Scheduler and task decomposition modules for autonomous background routines.

## Local setup

```bash
cd backend
python -m venv .venv
. .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env
uvicorn app.main:app --reload
```

## Tests

```bash
pytest
```

## Webhook contract

Endpoint:

```text
POST /webhooks/fanvue
```

Supported event types:

- `creator.subscription.activated`
- `creator.message.received`
- `creator.payment.succeeded`

Security:

- If `FANVUE_WEBHOOK_SECRET` is set, requests must include `x-fanvue-signature`.
- The signature format is `sha256=<hex-hmac-sha256-body>`.

Privacy:

- Subscriber profiles are keyed on stable `uuid`.
- Display names are not used as identifiers.
- Secrets belong in `.env`, never in source files.
- Configure `FANVUE_API_BASE_URL`, `FANVUE_OAUTH_TOKEN_PATH`, and `FANVUE_MESSAGES_PATH` from official Fanvue API/app settings; the client does not assume undocumented paths.

