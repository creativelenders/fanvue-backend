-- ============================================================
-- PostgreSQL schema for unified search index
-- Requires pgvector extension
-- Run:  psql $DATABASE_URL -f schema.sql
-- ============================================================

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE search_index (
  id                TEXT PRIMARY KEY,
  workspace_id      TEXT NOT NULL,
  source_type       TEXT NOT NULL,
  title             TEXT NOT NULL DEFAULT '',
  body              TEXT NOT NULL DEFAULT '',
  tags              JSONB DEFAULT '[]',
  searchable_text   TEXT NOT NULL DEFAULT '',

  -- Full-text search vector (auto-generated)
  searchable_text_tsv TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(searchable_text, ''))
  ) STORED,

  -- Embedding vector (256-dim for ogma-mini, 384 for granite-small)
  embedding         vector(256),

  -- Metadata for filtering
  metadata          JSONB DEFAULT '{}',

  -- Soft delete
  is_deleted        BOOLEAN DEFAULT false,

  -- Ownership
  created_by        TEXT NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX idx_search_workspace   ON search_index (workspace_id);
CREATE INDEX idx_search_source_type ON search_index (source_type);
CREATE INDEX idx_search_deleted     ON search_index (is_deleted);
CREATE INDEX idx_search_fts         ON search_index USING GIN (searchable_text_tsv);
CREATE INDEX idx_search_embedding   ON search_index USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_search_tags        ON search_index USING GIN (tags);
CREATE INDEX idx_search_metadata    ON search_index USING GIN (metadata);
CREATE INDEX idx_search_created     ON search_index (created_at DESC);

-- Multi-tenant row-level security
ALTER TABLE search_index ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON search_index
  USING (workspace_id = current_setting('app.workspace_id')::text);

-- Search history (for recents)
CREATE TABLE search_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  TEXT NOT NULL,
  user_id       TEXT NOT NULL,
  query         TEXT NOT NULL,
  entity_filter TEXT[],
  result_count  INTEGER,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_search_history_user ON search_history (workspace_id, user_id, created_at DESC);

-- Saved searches
CREATE TABLE saved_searches (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  TEXT NOT NULL,
  user_id       TEXT NOT NULL,
  name          TEXT NOT NULL,
  query         TEXT NOT NULL,
  entity_filter TEXT[],
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_saved_searches_user ON saved_searches (workspace_id, user_id);

-- Audit log
CREATE TABLE search_audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id TEXT NOT NULL,
  user_id      TEXT NOT NULL,
  action       TEXT NOT NULL,
  entity_type  TEXT,
  entity_id    TEXT,
  metadata     JSONB,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_audit_workspace ON search_audit_log (workspace_id, created_at DESC);
