"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";

interface ScrapeResult {
  recordsFound: number;
  recordsNew: number;
  recordsUpdated: number;
}

export function ScrapeButton({ onComplete }: { onComplete?: () => void }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runScrape = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/scrape/run", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Scrape failed");
      }
      const data = await res.json();
      setResult(data);
      onComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={runScrape}
        disabled={loading}
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        {loading ? "Scraping LADBS..." : "Run Scrape"}
      </button>
      {result && (
        <span className="text-sm text-green-600">
          Found {result.recordsFound} permits ({result.recordsNew} new, {result.recordsUpdated} updated)
        </span>
      )}
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
