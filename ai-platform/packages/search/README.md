# 🔍 Fanvue Unified AI Search

A production-ready, multi-tenant, hybrid search integration layer for your Fanvue Growth Platform SaaS.

## Features

- **Hybrid search**: keyword (Postgres FTS) + vector (pgvector) fused via Reciprocal Rank Fusion
- **AI-powered reasoning**: Qwythos-9B classifies intent, rewrites queries, routes entities, and generates grounded answers
- **Multi-tenant**: Row-level security ensures workspace isolation
- **Web research**: Optional Perplexity API connector for live external data
- **Keyboard-first**: Cmd+K command palette, filter pills, tabbed AI/Results views
- **Graceful degradation**: Falls back gracefully if AI or vector services are unavailable

## Quick Start

1. Add environment variables (copy `.env.example` → `.env.local`)
2. Run `npm install @xenova/transformers`
3. Deploy Qwythos-9B on HF Inference Endpoints
4. Apply schema: `psql $DATABASE_URL -f lib/search/schema.sql`
5. Add `<GlobalSearchBar />` to your layout
6. Reindex: `curl -X POST /api/search/index -d '{"action":"reindex"}' `
7. Search: `curl -X POST /api/search -d '{"query":"test"}'`

## Stack

| Layer | Choice |
|-------|--------|
| Frontend | Next.js + React (your existing app) |
| Search API | Next.js API routes |
| Database | Vercel Postgres + pgvector |
| LLM | Qwythos-9B-Q4_K_M (HF Inference Endpoint) |
| Embeddings | ogma-mini (local, @xenova/transformers) |
| Web search | Perplexity API (optional) |

## Architecture

See ARCHITECTURE.md for full details.

## API Endpoints

- `POST /api/search` — Unified search with AI answers
- `GET /api/search/suggestions?q=...` — Auto-complete
- `GET /api/search/recent` — Recent searches
- `POST /api/search/index` — Index/reindex/delete entities
