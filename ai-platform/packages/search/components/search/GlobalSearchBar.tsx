"use client";

import { useState, useEffect } from "react";
import { CommandPalette } from "./CommandPalette";

export function GlobalSearchBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setIsOpen(p => !p); }
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-[#1a1a2e] border border-[#2a2a4e] rounded-lg
                   text-[#64748b] hover:text-white hover:border-[#4ade80]/30 transition-all min-w-[320px]"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="flex-1 text-left text-sm">Search fans, prompts, content...</span>
        <kbd className="hidden sm:inline-flex text-xs px-1.5 py-0.5 bg-[#0f0f13] border border-[#2a2a4e] rounded">⌘K</kbd>
      </button>
      {isOpen && <CommandPalette query={query} onQueryChange={setQuery} onClose={() => { setIsOpen(false); setQuery(""); }} />}
    </>
  );
}
