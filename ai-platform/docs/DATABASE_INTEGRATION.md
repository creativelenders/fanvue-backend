# Database Integration

The API reads `DATABASE_URL` from environment variables.

Supported modes:

- Local development: `sqlite:///./fanvue_promotion.db`
- Production: PostgreSQL SQLAlchemy URL, for example `postgresql+psycopg://user:password@host:5432/fanvue_platform`

## Apply schema

Use your database application to run:

```text
infra/migrations/001_initial_platform.sql
```

The FastAPI app also calls `Base.metadata.create_all()` for local convenience, but production should use migrations controlled by your database tooling.

## Required seed data

Create at least one workspace and operator user:

```sql
INSERT INTO workspaces (id, name, plan) VALUES ('demo_workspace', 'Demo Workspace', 'internal');
INSERT INTO operator_users (id, workspace_id, email, role) VALUES ('demo_operator', 'demo_workspace', 'operator@example.com', 'owner');
```

Requests to `/platform/*` use:

- `x-workspace-id`
- `x-user-id`
- `x-user-role`

Replace this header-based context with your production auth provider when ready.

