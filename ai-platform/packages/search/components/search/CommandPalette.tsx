"use client";

import { useState, useEffect, useRef } from "react";
import type { SearchResponse, SourceType } from "@/lib/search/types";

interface Props {
  query: string;
  onQueryChange: (q: string) => void;
  onClose: () => void;
}

const ENTITY_TYPES: { type: SourceType; label: string }[] = [
  { type: "fan", label: "👤 Fans" },
  { type: "prompt_template", label: "📝 Prompts" },
  { type: "content_item", label: "📄 Content" },
  { type: "media_asset", label: "🖼 Media" },
  { type: "campaign", label: "📊 Campaigns" },
  { type: "automation_rule", label: "🤖 Automation" },
  { type: "conversation_flow", label: "💬 Conversations" },
  { type: "knowledge_document", label: "📚 Knowledge" },
];

export function CommandPalette({ query, onQueryChange, onClose }: Props) {
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"ai" | "results">("results");
  const [entityFilter, setEntityFilter] = useState<SourceType[] | undefined>();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (!query.trim()) { setResults(null); return; }
    clearTimeout(debounceRef.current);
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, entityFilter, limit: 10 }),
        });
        setResults(await res.json());
      } catch (e) { console.error("Search failed", e); }
      finally { setLoading(false); }
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [query, entityFilter]);

  const toggleFilter = (type: SourceType) => {
    setEntityFilter(prev => prev?.includes(type) ? prev.filter(t => t !== type) : [type]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-[#0f0f13] border border-[#2a2a4e] rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-top-2 duration-200">
        {/* Search input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#2a2a4e]">
          {loading ? (
            <div className="w-5 h-5 border-2 border-[#4ade80] border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5 text-[#64748b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => onQueryChange(e.target.value)}
            placeholder="Search fans, prompts, content, campaigns..."
            className="flex-1 bg-transparent text-white text-lg outline-none placeholder:text-[#475569]"
          />
          <kbd className="text-xs px-1.5 py-0.5 bg-[#1a1a2e] border border-[#2a2a4e] rounded text-[#64748b]">ESC</kbd>
        </div>

        {/* Entity type filter pills */}
        <div className="flex gap-2 px-5 py-2.5 border-b border-[#1a1a2e] overflow-x-auto">
          <button onClick={() => setEntityFilter(undefined)}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors
              ${!entityFilter ? "bg-[#4ade80]/20 text-[#4ade80] border border-[#4ade80]/40" : "bg-[#1a1a2e] text-[#64748b] border border-[#2a2a4e] hover:border-[#4ade80]/30"}`}>All</button>
          {ENTITY_TYPES.map(({ type, label }) => (
            <button key={type} onClick={() => toggleFilter(type)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors
                ${entityFilter?.includes(type) ? "bg-[#4ade80]/20 text-[#4ade80] border border-[#4ade80]/40" : "bg-[#1a1a2e] text-[#64748b] border border-[#2a2a4e] hover:border-[#4ade80]/30"}`}>{label}</button>
          ))}
        </div>

        {/* Tabs */}
        {results && (
          <div className="flex border-b border-[#1a1a2e] px-5">
            <button onClick={() => setActiveTab("ai")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors
                ${activeTab === "ai" ? "text-[#4ade80] border-[#4ade80]" : "text-[#64748b] border-transparent hover:text-white"}`}>
              AI Answer {results.aiAnswer ? "•" : ""}</button>
            <button onClick={() => setActiveTab("results")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors
                ${activeTab === "results" ? "text-[#4ade80] border-[#4ade80]" : "text-[#64748b] border-transparent hover:text-white"}`}>
              Results ({results.totalCount})</button>
          </div>
        )}

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto">
          {loading && <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-[#4ade80] border-t-transparent rounded-full animate-spin" /></div>}

          {!loading && results?.aiAnswer && activeTab === "ai" && (
            <div className="px-5 py-4 border-b border-[#1a1a2e]">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4ade80] to-[#22c55e] flex items-center justify-center text-black font-bold text-sm shrink-0">AI</div>
                <div className="text-sm text-[#e2e8f0] leading-relaxed">
                  {results.aiAnswer}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {results.citations.map((c, i) => (
                      <a key={c.id} href="#" className="text-xs text-[#4ade80]/80 hover:text-[#4ade80] underline underline-offset-2">[{i + 1}] {c.title}</a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {!loading && results && activeTab === "results" && (results.results.length > 0 ? results.results.map((result, idx) => (
            <a key={result.id} href={result.url}
              className="flex items-start gap-4 px-5 py-3 border-b border-[#1a1a2e] hover:bg-[#1a1a2e] transition-colors cursor-pointer">
              <div className="w-8 h-8 rounded-lg bg-[#1a1a2e] border border-[#2a2a4e] flex items-center justify-center text-xs shrink-0">{result.sourceType.slice(0, 2).toUpperCase()}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white truncate">{result.title}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#2a2a4e] text-[#64748b] capitalize">{result.sourceType.replace(/_/g, " ")}</span>
                </div>
                <p className="text-xs text-[#64748b] mt-0.5 line-clamp-2" dangerouslySetInnerHTML={{ __html: result.snippet }} />
              </div>
              <div className="text-[10px] text-[#475569] shrink-0">{Math.round(result.score * 100)}%</div>
            </a>
          )) : (
            <div className="px-5 py-8 text-center text-[#64748b] text-sm">No results found.</div>
          ))}
        </div>
      </div>
    </div>
  );
}
