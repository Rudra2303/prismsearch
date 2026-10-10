"use client";

import { useState } from "react";
import { Search, Globe, ArrowUpRight, Zap } from "lucide-react";

interface SearchItem {
  rank: number;
  title: string;
  link: string;
  domain: string;
  snippet: string;
}

interface EngineResult {
  label: string;
  engine: string;
  items: SearchItem[];
}

interface ApiResponse {
  query: string;
  engines: EngineResult[];
  consensusDomains: { domain: string; count: number }[];
  divergenceScore: number;
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/refract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to fetch results");
      }
      setData(json);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <Zap className="h-6 w-6 text-amber-400" />
              <h1 className="text-3xl font-black tracking-tight text-white">PrismSearch</h1>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Multi-engine algorithmic disparity & narrative divergence detector.
            </p>
          </div>

          <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto">
            <input
              type="text"
              placeholder="Search topic (e.g. AI policy, electric cars)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 w-full md:w-96 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 font-semibold px-4 py-2 rounded-lg text-sm transition flex items-center gap-1.5"
            >
              <Search className="h-4 w-4" />
              {loading ? "Refracting..." : "Refract"}
            </button>
          </form>
        </header>

        {error && (
          <div className="bg-red-950/50 border border-red-800 text-red-200 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {data && (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
              <span className="text-xs uppercase text-slate-400 font-bold">Query Divergence Index</span>
              <div className="text-2xl font-black text-amber-400 mt-1">{data.divergenceScore}%</div>
              <p className="text-xs text-slate-500 mt-1">Algorithmic variance across target engines.</p>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
              <span className="text-xs uppercase text-slate-400 font-bold">Engines Queried</span>
              <div className="text-2xl font-black text-white mt-1">{data.engines.length} Platforms</div>
              <p className="text-xs text-slate-500 mt-1">Fetched concurrently via SerpApi.</p>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
              <span className="text-xs uppercase text-slate-400 font-bold">Consensus Domains</span>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {data.consensusDomains.slice(0, 4).map((d) => (
                  <span key={d.domain} className="bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-xs text-slate-300">
                    {d.domain} ({d.count}/{data.engines.length})
                  </span>
                ))}
              </div>
            </div>
          </section>
        )}

        {data && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.engines.map((group) => (
              <div key={group.label} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-slate-400" />
                    <span className="font-semibold text-sm text-slate-200">{group.label}</span>
                  </div>
                  <span className="text-xs text-slate-500 font-mono">{group.items.length} items</span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] pr-1">
                  {group.items.map((item) => (
                    <div key={item.rank + item.link} className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3 hover:border-slate-700 transition">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                        <span className="font-mono text-amber-400 font-bold">#{item.rank}</span>
                        <span className="truncate max-w-[140px] font-mono">{item.domain}</span>
                      </div>
                      <a href={item.link} target="_blank" rel="noreferrer" className="text-xs font-semibold text-slate-200 hover:text-amber-400 transition line-clamp-2 flex items-start gap-1">
                        <span>{item.title}</span>
                        <ArrowUpRight className="h-3 w-3 shrink-0 opacity-60" />
                      </a>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-1.5 leading-relaxed">{item.snippet}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}