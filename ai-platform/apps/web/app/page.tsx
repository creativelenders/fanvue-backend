import type { ApprovalItem, Campaign, DashboardSummary, MediaJob } from "@fanvue-platform/shared-types";
import { createHmac } from "crypto";

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

async function fetchJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const workspaceId = process.env.DEMO_WORKSPACE_ID || "demo_workspace";
    const userId = process.env.DEMO_USER_ID || "demo_operator";
    const role = process.env.DEMO_USER_ROLE || "owner";
    const secret = process.env.API_AUTH_SECRET;
    if (!secret) throw new Error("API_AUTH_SECRET is required for server-side API requests");
    const signature = createHmac("sha256", secret)
      .update(`${timestamp}.GET.${path}.${workspaceId}.${userId}.${role}`)
      .digest("hex");
    const response = await fetch(`${apiBase}${path}`, {
      headers: {
        "x-workspace-id": workspaceId,
        "x-user-id": userId,
        "x-user-role": role,
        "x-auth-timestamp": timestamp,
        "x-auth-signature": signature
      },
      cache: "no-store"
    });
    if (!response.ok) return fallback;
    return response.json();
  } catch {
    return fallback;
  }
}

export default async function Page() {
  const dashboard = await fetchJson<DashboardSummary>("/platform/dashboard", {
    campaigns: 0,
    media_jobs: 0,
    pending_approvals: 0
  });
  const campaigns = await fetchJson<Campaign[]>("/platform/campaigns", []);
  const mediaJobs = await fetchJson<MediaJob[]>("/platform/media/jobs", []);
  const approvals = await fetchJson<ApprovalItem[]>("/platform/approvals", []);

  return (
    <main className="shell">
      <nav className="nav">
        <div>
          <p className="eyebrow">Fanvue Promotion OS</p>
          <h1>Creator revenue operations cockpit</h1>
        </div>
        <div className="status">API: {apiBase}</div>
      </nav>

      <section className="grid hero-grid">
        <Metric label="Campaigns" value={dashboard.campaigns} />
        <Metric label="Media Jobs" value={dashboard.media_jobs} />
        <Metric label="Pending Approvals" value={dashboard.pending_approvals} />
      </section>

      <section className="grid two">
        <Panel title="Campaign Builder" action="POST /platform/campaigns">
          <p>Create conversion campaigns, channel mixes, offers, and fan segments. Job creation requires authenticated operator actions.</p>
          <List rows={campaigns.map((item) => `${item.name} · ${item.status} · ${item.objective}`)} empty="No campaigns yet." />
        </Panel>

        <Panel title="AI Media Pipeline" action="POST /platform/media/jobs">
          <p>Queue synchronized teaser/unlock variants with LoRA strength and PPV pricing.</p>
          <List rows={mediaJobs.map((item) => `${item.id} · ${item.status} · seed ${item.seed}`)} empty="No media jobs yet." />
        </Panel>
      </section>

      <section className="grid three">
        <Panel title="CRM & Webhooks" action="POST /webhooks/fanvue">
          <p>Subscription activation, messages, payments, PPV release gates, and attribution logs.</p>
        </Panel>
        <Panel title="Human Review Queue" action="GET /platform/approvals">
          <List rows={approvals.map((item) => `${item.title} · ${item.status}`)} empty="No approval items." />
        </Panel>
        <Panel title="Autonomous Ops" action="@thermonuclear_review">
          <p>Agent loops, review council, learning journals, skill registry, scheduler, and health audits.</p>
        </Panel>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <article className="metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </article>
  );
}

function Panel({ title, action, children }: { title: string; action: string; children: React.ReactNode }) {
  return (
    <article className="panel">
      <div className="panel-head">
        <h2>{title}</h2>
        <code>{action}</code>
      </div>
      {children}
    </article>
  );
}

function List({ rows, empty }: { rows: string[]; empty: string }) {
  return <ul className="list">{rows.length ? rows.map((row) => <li key={row}>{row}</li>) : <li>{empty}</li>}</ul>;
}
