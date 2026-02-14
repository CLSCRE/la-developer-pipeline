"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GitMerge, Loader2, X, AlertTriangle } from "lucide-react";
import { LeadScoreBadge } from "@/components/LeadScoreBadge";

interface DeveloperInfo {
  id: string;
  name: string;
  normalizedName: string;
  leadScore: number | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  entityType: string | null;
  projectCount: number;
  outreachCount: number;
}

interface DuplicatePair {
  developer1: DeveloperInfo;
  developer2: DeveloperInfo;
  distance: number;
}

function ConfidenceBadge({ distance }: { distance: number }) {
  if (distance <= 1) {
    return (
      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
        High confidence
      </span>
    );
  }
  return (
    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
      Medium confidence
    </span>
  );
}

function DevCard({ dev, label }: { dev: DeveloperInfo; label: string }) {
  return (
    <div className="flex-1 bg-slate-50 rounded-lg p-4 space-y-2">
      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">{label}</p>
      <div className="flex items-center gap-2">
        <LeadScoreBadge score={dev.leadScore} size="sm" />
        <Link href={`/developers/${dev.id}`} className="text-sm font-semibold text-blue-600 hover:text-blue-800 truncate">
          {dev.name}
        </Link>
      </div>
      <div className="text-xs text-slate-500 space-y-1">
        {dev.entityType && <p>Entity: {dev.entityType}</p>}
        {dev.email && <p>Email: {dev.email}</p>}
        {dev.phone && <p>Phone: {dev.phone}</p>}
        {dev.website && <p>Web: {dev.website}</p>}
        {dev.address && <p className="truncate">Addr: {dev.address}</p>}
        <p className="font-medium text-slate-600">
          {dev.projectCount} project{dev.projectCount !== 1 ? "s" : ""} / {dev.outreachCount} outreach
        </p>
      </div>
    </div>
  );
}

export default function DedupPage() {
  const [pairs, setPairs] = useState<DuplicatePair[]>([]);
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const fetchPairs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dedup");
      const data = await res.json();
      if (res.ok) {
        setPairs(data.pairs);
      } else {
        setError(data.error || "Failed to load duplicates");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPairs();
  }, []);

  const handleMerge = async (primaryId: string, secondaryId: string) => {
    const key = `${primaryId}-${secondaryId}`;
    setMerging(key);
    try {
      const res = await fetch("/api/dedup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primaryId, secondaryId }),
      });
      if (res.ok) {
        // Remove merged pair and any other pairs involving the secondary
        setPairs((prev) =>
          prev.filter(
            (p) =>
              p.developer1.id !== secondaryId && p.developer2.id !== secondaryId
          )
        );
      } else {
        const data = await res.json();
        alert(data.error || "Merge failed");
      }
    } catch {
      alert("Network error during merge");
    } finally {
      setMerging(null);
    }
  };

  const handleDismiss = (dev1Id: string, dev2Id: string) => {
    setDismissed((prev) => new Set(prev).add(`${dev1Id}-${dev2Id}`));
  };

  const visiblePairs = pairs.filter(
    (p) => !dismissed.has(`${p.developer1.id}-${p.developer2.id}`)
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <GitMerge size={24} /> Deduplication
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review and merge potential duplicate developer records
          </p>
        </div>
        <button
          onClick={fetchPairs}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <GitMerge size={14} />}
          {loading ? "Scanning..." : "Re-scan"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-sm text-red-700">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse">
              <div className="h-6 bg-slate-200 rounded w-1/3 mb-2" />
              <div className="h-20 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      ) : visiblePairs.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <GitMerge size={32} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No potential duplicates found.</p>
          <p className="text-xs text-slate-400 mt-1">All developer names are sufficiently different.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">{visiblePairs.length} potential duplicate pair{visiblePairs.length !== 1 ? "s" : ""} found</p>
          {visiblePairs.map((pair) => {
            const key = `${pair.developer1.id}-${pair.developer2.id}`;
            const recommend1 = pair.developer1.projectCount >= pair.developer2.projectCount;
            return (
              <div key={key} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ConfidenceBadge distance={pair.distance} />
                    <span className="text-xs text-slate-400">
                      Edit distance: {pair.distance} | Normalized: &quot;{pair.developer1.normalizedName}&quot; vs &quot;{pair.developer2.normalizedName}&quot;
                    </span>
                  </div>
                  <button
                    onClick={() => handleDismiss(pair.developer1.id, pair.developer2.id)}
                    className="text-slate-400 hover:text-slate-600"
                    title="Dismiss"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="p-5">
                  <div className="flex gap-4">
                    <DevCard dev={pair.developer1} label="Developer A" />
                    <DevCard dev={pair.developer2} label="Developer B" />
                  </div>
                  <div className="flex items-center justify-center gap-3 mt-4">
                    <button
                      onClick={() => handleMerge(pair.developer1.id, pair.developer2.id)}
                      disabled={merging === key}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        recommend1
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "text-slate-600 border border-slate-200 hover:bg-slate-50"
                      } disabled:opacity-50`}
                    >
                      {merging === key ? <Loader2 size={14} className="animate-spin" /> : <GitMerge size={14} />}
                      Merge into A{recommend1 ? " (recommended)" : ""}
                    </button>
                    <button
                      onClick={() => handleMerge(pair.developer2.id, pair.developer1.id)}
                      disabled={merging === key}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        !recommend1
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "text-slate-600 border border-slate-200 hover:bg-slate-50"
                      } disabled:opacity-50`}
                    >
                      {merging === key ? <Loader2 size={14} className="animate-spin" /> : <GitMerge size={14} />}
                      Merge into B{!recommend1 ? " (recommended)" : ""}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
