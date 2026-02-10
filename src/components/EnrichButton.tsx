"use client";

import { useState } from "react";
import { Search } from "lucide-react";

interface EnrichResult {
  total: number;
  enriched: number;
  failed: number;
  skipped: number;
}

export function EnrichButton({ onComplete }: { onComplete?: () => void }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EnrichResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runEnrich = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/enrich/assessor", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Enrichment failed");
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
        onClick={runEnrich}
        disabled={loading}
        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Search size={14} className={loading ? "animate-pulse" : ""} />
        {loading ? "Enriching from Assessor..." : "Enrich All (Assessor)"}
      </button>
      {result && (
        <span className="text-sm text-green-600">
          {result.enriched} enriched of {result.total} ({result.failed} failed)
        </span>
      )}
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
