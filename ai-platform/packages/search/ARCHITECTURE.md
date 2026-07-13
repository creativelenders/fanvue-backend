# Fanvue Unified AI Search — Architecture Overview

## High-Level Flow

```
User types query
    │
    ▼
[GlobalSearchBar] ──► POST /api/search
                            │
                            ▼
                   [Search Orchestrator]
                            │
                    ┌───────┼───────┐
                    ▼       ▼       ▼
            [Intent     [Query     [Entity
             Classifier] Rewriter]  Router]
                    │       │       │
                    └───────┼───────┘
                            ▼
                   [Strategy Decision]
                    ┌───┬───┬───┬───┐
                    ▼   ▼   ▼   ▼   ▼
               keyword vector hybrid web
                    │   │   │       │
                    └───┼───┘       │
                        ▼           ▼
                 [RRF Fusion]  [Perplexity]
                        │           │
                        └─────┬─────┘
                              ▼
                       [Reranker]
                              ▼
                       [Qwythos Summarizer]
                              │
                              ▼
                    SearchResponse (JSON)
```

## Key Design Decisions

1. **Single database**: Vercel Postgres + pgvector holds everything — app data, search index, vectors, audit logs. No sync complexity.

2. **No separate embedding service**: ogma-mini (3.5M params, 14MB) runs locally in Next.js via @xenova/transformers. Zero infra.

3. **Qwythos-9B on HF Inference Endpoints**: llama.cpp container, OpenAI-compatible API, auto-scales to zero.

4. **Multi-tenant by design**: Every row has workspaceId. RLS enforces isolation. Auth context flows via request headers.

5. **Graceful degradation**: Fallback chain — hybrid → keyword → error. AI answer is optional.

## File Structure

```
/lib/search/
├── types.ts              # All TypeScript interfaces
├── orchestrator.ts       # Main search coordinator
├── retrieval.ts          # Keyword + vector + hybrid retrieval
├── rerank.ts             # Score normalization and boosting
├── prompts.ts            # Qwythos prompt templates
├── embeddings.ts         # Embedding generation (TEI or local)
├── qwythos-client.ts     # Qwythos inference API client
├── perplexity-client.ts  # Perplexity web search API client
├── auth.ts               # Auth context extraction
├── audit.ts              # Audit logging
├── index-worker.ts       # Bulk reindex worker
└── schema.sql            # PostgreSQL + pgvector schema

/app/api/search/
├── route.ts              # POST /api/search
├── suggestions/route.ts  # GET /api/search/suggestions
├── recent/route.ts       # GET /api/search/recent
└── index/route.ts        # POST /api/search/index

/components/search/
├── GlobalSearchBar.tsx   # Top nav search trigger
└── CommandPalette.tsx    # Cmd+K modal overlay
```
