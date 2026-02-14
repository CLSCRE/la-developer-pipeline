"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Link2, Unlink, UserPlus, X } from "lucide-react";

interface Developer {
  id: string;
  name: string;
  company?: string;
  email?: string;
  pipelineStage: string;
}

interface DeveloperLinkerProps {
  projectId: string;
  currentDeveloper?: Developer | null;
  ownerName?: string | null;
  onLink: () => void;
}

const stageColors: Record<string, string> = {
  new: "bg-slate-100 text-slate-700",
  contacted: "bg-blue-100 text-blue-800",
  in_discussion: "bg-amber-100 text-amber-800",
  proposal_sent: "bg-violet-100 text-violet-800",
  won: "bg-green-100 text-green-800",
  lost: "bg-red-100 text-red-800",
  dormant: "bg-slate-100 text-slate-500",
};

export default function DeveloperLinker({ projectId, currentDeveloper, ownerName, onLink }: DeveloperLinkerProps) {
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Developer[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!searching || query.length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/developers?search=${encodeURIComponent(query)}&limit=10`);
        const data = await res.json();
        setResults(data.developers || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, searching]);

  const linkDeveloper = async (developerId: string) => {
    await fetch(`/api/projects/${projectId}/link-developer`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ developerId }),
    });
    setSearching(false);
    setQuery("");
    onLink();
  };

  const unlinkDeveloper = async () => {
    await fetch(`/api/projects/${projectId}/link-developer`, { method: "DELETE" });
    onLink();
  };

  const createFromOwner = async () => {
    setCreating(true);
    try {
      await fetch(`/api/projects/${projectId}/create-developer`, { method: "POST" });
      onLink();
    } finally {
      setCreating(false);
    }
  };

  if (currentDeveloper) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-4">
          <Link2 size={16} /> Linked Developer
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <Link href={`/developers/${currentDeveloper.id}`} className="text-blue-600 hover:text-blue-800 font-medium">
              {currentDeveloper.name}
            </Link>
            {currentDeveloper.company && (
              <p className="text-sm text-slate-500">{currentDeveloper.company}</p>
            )}
            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${stageColors[currentDeveloper.pipelineStage] || "bg-slate-100 text-slate-600"}`}>
              {currentDeveloper.pipelineStage.replace("_", " ")}
            </span>
          </div>
          <button
            onClick={unlinkDeveloper}
            className="text-slate-400 hover:text-red-500 transition-colors"
            title="Unlink developer"
          >
            <Unlink size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-4">
        <Link2 size={16} /> Link Developer
      </h3>

      {ownerName && (
        <div className="mb-3 p-3 bg-slate-50 rounded-lg flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500">Owner on Permit</p>
            <p className="text-sm font-medium text-slate-900">{ownerName}</p>
          </div>
          <button
            onClick={createFromOwner}
            disabled={creating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <UserPlus size={12} />
            {creating ? "Creating..." : "Create Developer"}
          </button>
        </div>
      )}

      {searching ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search developers..."
                className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
            <button onClick={() => { setSearching(false); setQuery(""); }} className="text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          </div>
          {loading && <p className="text-xs text-slate-400">Searching...</p>}
          {results.length > 0 && (
            <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-48 overflow-y-auto">
              {results.map((dev) => (
                <button
                  key={dev.id}
                  onClick={() => linkDeveloper(dev.id)}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm"
                >
                  <span className="font-medium text-slate-900">{dev.name}</span>
                  {dev.company && <span className="text-slate-500 ml-2">{dev.company}</span>}
                </button>
              ))}
            </div>
          )}
          {query.length >= 2 && !loading && results.length === 0 && (
            <p className="text-xs text-slate-400">No developers found</p>
          )}
        </div>
      ) : (
        <button
          onClick={() => setSearching(true)}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
        >
          <Search size={14} /> Search & Link Existing Developer
        </button>
      )}
    </div>
  );
}
