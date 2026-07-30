"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, FolderKanban, Loader2, PackageSearch, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { searchAll, type SearchResult } from "./search-actions";

const GROUP_META: Record<SearchResult["kind"], { label: string; icon: typeof Search }> = {
  project: { label: "Projects", icon: FolderKanban },
  material: { label: "Materials", icon: PackageSearch },
  date: { label: "Dates", icon: CalendarDays },
};

function highlightMatch(text: string, query: string): ReactNode {
  if (!query.trim()) return text;
  const index = text.toLowerCase().indexOf(query.trim().toLowerCase());
  if (index === -1) return text;
  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded-sm bg-primary/20 text-inherit">
        {text.slice(index, index + query.trim().length)}
      </mark>
      {text.slice(index + query.trim().length)}
    </>
  );
}

export function DashboardSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [pending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function runSearch(value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const found = await searchAll(value);
        setResults(found);
        setActiveIndex(0);
        setOpen(true);
      });
    }, 200);
  }

  function handleChange(value: string) {
    setQuery(value);
    runSearch(value);
  }

  function navigateTo(result: SearchResult) {
    setOpen(false);
    setQuery("");
    setResults([]);
    if (result.kind === "project") {
      router.push(`/projects/${result.id}`);
    } else if (result.kind === "material") {
      router.push(`/projects/${result.projectId}?tab=materials&highlight=${result.id}`);
    } else {
      router.push(`/projects/${result.projectId}?tab=calendar&date=${result.dateISO.slice(0, 10)}`);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      navigateTo(results[activeIndex]);
    }
  }

  return (
    <div ref={containerRef} className="relative w-full sm:max-w-sm">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search projects, materials, dates…"
          className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-9 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
        />
        {pending && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {open && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg">
          {results.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              No results for &ldquo;{query}&rdquo;
            </p>
          ) : (
            <div className="max-h-96 overflow-y-auto py-1">
              {results.map((r, i) => {
                const showHeader = i === 0 || results[i - 1].kind !== r.kind;
                const meta = GROUP_META[r.kind];
                return (
                  <div key={`${r.kind}-${r.id}`}>
                    {showHeader && (
                      <div className="flex items-center gap-1.5 px-3 pt-2 pb-1 text-xs font-medium text-muted-foreground">
                        <meta.icon className="h-3.5 w-3.5" />
                        {meta.label}
                      </div>
                    )}
                    <button
                      type="button"
                      onMouseEnter={() => setActiveIndex(i)}
                      onClick={() => navigateTo(r)}
                      className={cn(
                        "flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm",
                        i === activeIndex && "bg-accent text-accent-foreground"
                      )}
                    >
                      <span className="font-medium">{highlightMatch(r.title, query)}</span>
                      {r.subtitle && (
                        <span className="text-xs text-muted-foreground">{r.subtitle}</span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
