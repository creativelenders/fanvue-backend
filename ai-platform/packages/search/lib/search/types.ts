// ============================================================
// Search types — all TypeScript interfaces for unified search
// ============================================================

export type SourceType =
  | "fan"
  | "prompt_template"
  | "content_item"
  | "media_asset"
  | "campaign"
  | "automation_rule"
  | "conversation_flow"
  | "keyword_trigger"
  | "knowledge_document";

export type SearchIntent =
  | "lookup"       // specific entity by name/ID
  | "semantic"     // conceptual queries, similarity
  | "factoid"      // factual questions about metrics
  | "explore"      // open-ended discovery
  | "external";    // needs live web data

export interface SearchQuery {
  rawQuery: string;
  workspaceId: string;
  userId: string;
  rewriteQuery?: string;
  intent?: SearchIntent;
  entityFilter?: SourceType[];
  dateRange?: { from: string; to: string };
  tags?: string[];
  mode: "hybrid" | "keyword" | "vector" | "web";
  limit: number;
  offset: number;
  includeWebResults: boolean;
}

export interface SearchResult {
  id: string;
  score: number;
  sourceType: SourceType;
  title: string;
  snippet: string;          // HTML-highlighted excerpt
  url: string;              // deep link into your app
  entity: Record<string, unknown>;
  highlights: { field: string; text: string }[];
  permissionLevel: "owner" | "editor" | "viewer";
  metadata: Record<string, unknown>;
}

export interface SearchResponse {
  query: SearchQuery;
  aiAnswer: string | null;
  citations: { id: string; title: string; snippet: string }[];
  results: SearchResult[];
  totalCount: number;
  facets: { sourceType: SourceType; count: number }[];
  suggestedActions: { label: string; action: string; context: string }[];
  webResults?: { title: string; url: string; snippet: string; source: string }[];
  latencyMs: number;
}

export interface SearchableEntity {
  id: string;
  workspaceId: string;
  title: string;
  description: string;
  body: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  permissions: { ownerId: string; role: "owner"|"editor"|"viewer"; teamIds: string[] };
  isDeleted: boolean;
  sourceType: SourceType;
  searchableText: string;
  embedding: number[] | null;
  metadata: Record<string, unknown>;
}
