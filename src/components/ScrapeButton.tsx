"use client";

import { useState } from "react";
import { RefreshCw, ChevronDown, Database, FileSearch } from "lucide-react";

interface ScrapeResult {
  recordsFound: number;
  recordsNew: number;
  recordsUpdated: number;
  enrichment?: {
    matched: number;
    enriched: number;
    developersCreated: number;
  } | null;
  submitted?: {
    recordsFound: number;
    recordsNew: number;
    recordsUpdated: number;
  } | null;
  scores?: {
    updated: number;
  } | null;
}

export function ScrapeButton({ onComplete }: { onComplete?: () => void }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [dateFrom, setDateFrom] = useState("2020-01-01");
  const [includeOldDataset, setIncludeOldDataset] = useState(false);
  const [includeSubmitted, setIncludeSubmitted] = useState(true);

  const runScrape = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setShowOptions(false);

    try {
      const res = await fetch("/api/scrape/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateFrom, includeOldDataset, includeSubmitted }),
      });
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
    <div className="relative">
      <div className="flex items-center gap-2">
        <button
          onClick={runScrape}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          {loading ? "Scraping..." : "Run Scrape"}
        </button>
        <button
          onClick={() => setShowOptions(!showOptions)}
          disabled={loading}
          className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
        >
          <ChevronDown size={14} className={showOptions ? "rotate-180 transition-transform" : "transition-transform"} />
          Options
        </button>
      </div>

      {showOptions && (
        <div className="absolute right-0 top-12 z-10 bg-white border border-slate-200 rounded-lg shadow-lg p-4 w-80 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Date From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-400 mt-0.5">Fetch permits from this date onward</p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeSubmitted}
              onChange={(e) => setIncludeSubmitted(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-700">
              <FileSearch size={12} className="inline mr-1" />
              Include submitted permits (entitlement pipeline)
            </span>
          </label>
          <p className="text-xs text-slate-400">Pre-issuance permits: Submitted, Plan Check, PC Approved, Ready to Issue. ~5K permits with $500K+ valuation.</p>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeOldDataset}
              onChange={(e) => setIncludeOldDataset(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-700">
              <Database size={12} className="inline mr-1" />
              Include old dataset (contractor/applicant names)
            </span>
          </label>
          <p className="text-xs text-slate-400">The old LADBS dataset has contractor and applicant info that the new one doesn&apos;t. This will also create developer profiles.</p>
        </div>
      )}

      {result && (
        <div className="mt-2 text-sm">
          <span className="text-green-600">
            Found {result.recordsFound} permits ({result.recordsNew} new, {result.recordsUpdated} updated)
          </span>
          {result.submitted && (
            <span className="block text-amber-600">
              Submitted: {result.submitted.recordsFound} permits ({result.submitted.recordsNew} new, {result.submitted.recordsUpdated} updated)
            </span>
          )}
          {result.enrichment && (
            <span className="block text-blue-600">
              Old dataset: {result.enrichment.matched} matched, {result.enrichment.enriched} enriched, {result.enrichment.developersCreated} developers created
            </span>
          )}
          {result.scores && (
            <span className="block text-violet-600">
              Lead scores updated for {result.scores.updated} developers
            </span>
          )}
        </div>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
