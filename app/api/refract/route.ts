import { NextRequest, NextResponse } from "next/server";
import { getJson } from "serpapi";

interface TargetEngine {
  engine: string;
  label: string;
  gl?: string;
  hl?: string;
  cc?: string;
  kl?: string;
}

interface SerpOrganicResult {
  title?: string;
  link?: string;
  snippet?: string;
}

interface SerpApiResponse {
  organic_results?: SerpOrganicResult[];
}

interface FormattedSearchItem {
  rank: number;
  title: string;
  link: string;
  domain: string;
  snippet: string;
}

interface FormattedEngineResult {
  label: string;
  engine: string;
  items: FormattedSearchItem[];
}

const cleanDomain = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query = typeof body.query === "string" ? body.query : "";

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const apiKey = process.env.SERPAPI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "SERPAPI_API_KEY is missing in .env.local" },
        { status: 500 }
      );
    }

    const targetEngines: TargetEngine[] = [
      { engine: "google", gl: "us", hl: "en", label: "Google (US)" },
      { engine: "google", gl: "in", hl: "en", label: "Google (India)" },
      { engine: "bing", cc: "US", label: "Bing (US)" },
      { engine: "duckduckgo", kl: "us-en", label: "DuckDuckGo" },
    ];

    const settledResults = await Promise.allSettled(
      targetEngines.map((t) =>
        getJson({
          api_key: apiKey,
          engine: t.engine,
          q: query,
          gl: t.gl,
          hl: t.hl,
          cc: t.cc,
          kl: t.kl,
          num: 8,
        })
      )
    );

    const engines: FormattedEngineResult[] = targetEngines.map((target, idx) => {
      const res = settledResults[idx];
      if (res.status !== "fulfilled") {
        return { label: target.label, engine: target.engine, items: [] };
      }

      const val = res.value as SerpApiResponse;
      if (!val || !Array.isArray(val.organic_results)) {
        return { label: target.label, engine: target.engine, items: [] };
      }

      const items: FormattedSearchItem[] = val.organic_results
        .slice(0, 8)
        .map((item: SerpOrganicResult, rankIdx: number) => ({
          rank: rankIdx + 1,
          title: item.title ?? "No Title",
          link: item.link ?? "#",
          domain: cleanDomain(item.link ?? ""),
          snippet: item.snippet ?? "",
        }));

      return { label: target.label, engine: target.engine, items };
    });

    const domainCounts: Record<string, number> = {};
    engines.forEach((e) => {
      const uniqueInEngine = new Set<string>(
        e.items.map((i: FormattedSearchItem) => i.domain)
      );
      uniqueInEngine.forEach((domain: string) => {
        domainCounts[domain] = (domainCounts[domain] || 0) + 1;
      });
    });

    const consensusDomains = Object.entries(domainCounts)
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count);

    const uniqueCount = Object.keys(domainCounts).length;
    const maxPossible = engines.length * 8;
    const divergenceScore =
      maxPossible > 1
        ? Math.min(
            100,
            Math.round(((uniqueCount - 1) / (maxPossible - 1)) * 100)
          )
        : 0;

    return NextResponse.json({
      query,
      engines,
      consensusDomains,
      divergenceScore,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}