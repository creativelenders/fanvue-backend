import "dotenv/config";
import { buildApp } from "./app";
import { db } from "./db/client";
import { sql } from "drizzle-orm";

async function start() {
  const app = await buildApp();
  const port = parseInt(process.env.PORT || "3001", 10);
  const host = process.env.HOST || "0.0.0.0";

  try {
    // Auto-fix foreign key constraints for production
    const queries = [
      "ALTER TABLE operator_users DROP CONSTRAINT IF EXISTS operator_users_workspace_id_fkey;",
      "ALTER TABLE operator_users ADD CONSTRAINT operator_users_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;",
      "ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_workspace_id_fkey;",
      "ALTER TABLE campaigns ADD CONSTRAINT campaigns_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;",
      "ALTER TABLE media_generation_jobs DROP CONSTRAINT IF EXISTS media_generation_jobs_workspace_id_fkey;",
      "ALTER TABLE media_generation_jobs ADD CONSTRAINT media_generation_jobs_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;",
      "ALTER TABLE approval_items DROP CONSTRAINT IF EXISTS approval_items_workspace_id_fkey;",
      "ALTER TABLE approval_items ADD CONSTRAINT approval_items_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;",
      "ALTER TABLE webhook_endpoints DROP CONSTRAINT IF EXISTS webhook_endpoints_workspace_id_fkey;",
      "ALTER TABLE webhook_endpoints ADD CONSTRAINT webhook_endpoints_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;",
      "ALTER TABLE autonomous_ops DROP CONSTRAINT IF EXISTS autonomous_ops_workspace_id_fkey;",
      "ALTER TABLE autonomous_ops ADD CONSTRAINT autonomous_ops_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;"
    ];
    for (const q of queries) {
      try { await db.execute(sql.raw(q)); } catch (e) { /* ignore if already applied */ }
    }

    await app.listen({ port, host });
    console.log(`
┌──────────────────────────────────────────┐
│ 🚀 FanVue Growth Platform API            │
│ 📡 http://${host}:${port}                    │
│ 📊 Environment: ${process.env.NODE_ENV || "development"}  │
│ 📚 API Docs: http://${host}:${port}/docs      │
└──────────────────────────────────────────┘`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
