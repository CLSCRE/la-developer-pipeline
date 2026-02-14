"use client";

import { useState } from "react";
import { UserSearch } from "lucide-react";

interface EnrichContactsButtonProps {
  developerId?: string;
  onComplete?: () => void;
}

export function EnrichContactsButton({ developerId, onComplete }: EnrichContactsButtonProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runEnrich = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/enrich/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(developerId ? { developerId } : {}),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Contact enrichment failed");
      }

      const data = await res.json();

      if (developerId) {
        const parts: string[] = [];
        if (data.sos) parts.push("SOS");
        if (data.googlePlaces) parts.push("Google Places");
        setResult(parts.length > 0 ? `Enriched from ${parts.join(" + ")}` : "No new data found");
      } else {
        const sosPart = data.sos ? `SOS: ${data.sos.enriched}/${data.sos.total}` : "";
        const gpPart = data.googlePlaces ? `Places: ${data.googlePlaces.enriched}/${data.googlePlaces.total}` : "";
        const parts = [sosPart, gpPart].filter(Boolean);
        setResult(parts.join(" | ") || "No new data");
        if (data.note) setResult((prev) => `${prev} (${data.note})`);
      }

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
        <UserSearch size={14} className={loading ? "animate-pulse" : ""} />
        {loading
          ? developerId
            ? "Enriching contacts..."
            : "Enriching all contacts..."
          : developerId
            ? "Enrich Contacts"
            : "Enrich All Contacts"}
      </button>
      {result && <span className="text-sm text-green-600">{result}</span>}
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
