import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "../ui/Badge";
import { Skeleton } from "../ui/Skeleton";
import { useAgency } from "../../hooks/useAgency";
import { globalSearch, type SearchResult } from "../../lib/search";

export function CommandPalette({ isOpen, setIsOpen }: { isOpen: boolean; setIsOpen: (isOpen: boolean) => void }) {
  const { agency } = useAgency();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setIsOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const timeout = window.setTimeout(async () => {
      setIsLoading(true);
      try {
        setResults(await globalSearch(query, agency?.id));
      } finally {
        setIsLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [agency?.id, isOpen, query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/50 p-4">
      <div className="mx-auto mt-20 max-w-2xl rounded-lg bg-white shadow-2xl dark:bg-slate-900">
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <Search className="size-5 text-slate-400" />
          <input
            autoFocus
            className="h-11 flex-1 bg-transparent text-sm outline-none"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search candidates, jobs, placements..."
          />
          <button className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setIsOpen(false)} type="button">
            <X className="size-5" />
          </button>
        </div>
        <div className="max-h-[420px] overflow-y-auto p-3">
          {isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : results.length ? (
            <div className="space-y-2">
              {results.map((result) => (
                <Link
                  key={`${result.group}-${result.id}`}
                  to={result.href}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-between gap-3 rounded-lg px-3 py-3 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <div>
                    <p className="text-sm font-semibold">{result.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{result.subtitle}</p>
                  </div>
                  <Badge>{result.group}</Badge>
                </Link>
              ))}
            </div>
          ) : (
            <p className="px-3 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
              {query ? "No results found." : "Start typing to search across your workspace."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
