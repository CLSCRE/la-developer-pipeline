"use client";

import { useState, useEffect } from "react";
import { Download, Database, Users, RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface ScrapeRun {
  id: string;
  source: string;
  status: string;
  recordsFound: number;
  recordsNew: number;
  recordsUpdated: number;
  errorMessage?: string | null;
  startedAt: string;
  completedAt?: string | null;
}

export default function DataManagement() {
  const [scrapeHistory, setScrapeHistory] = useState<ScrapeRun[]>([]);
  const [exporting, setExporting] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [enrichResult, setEnrichResult] = useState<string | null>(null);

  const loadHistory = () => {
    fetch("/api/scrape/history")
      .then((r) => r.json())
      .then((data) => setScrapeHistory(Array.isArray(data) ? data : []));
  };

  useEffect(() => { loadHistory(); }, []);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/export/projects");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `projects-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const runEnrichment = async () => {
    setEnriching(true);
    setEnrichResult(null);
    try {
      const res = await fetch("/api/scrape/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateFrom: "2020-01-01", includeOldDataset: true }),
      });
      const data = await res.json();
      if (data.error) {
        setEnrichResult(`Error: ${data.error}`);
      } else {
        const parts = [`${data.recordsFound} permits (${data.recordsNew} new, ${data.recordsUpdated} updated)`];
        if (data.enrichment) {
          parts.push(`Old dataset: ${data.enrichment.matched} matched, ${data.enrichment.enriched} enriched, ${data.enrichment.developersCreated} developers created`);
        }
        setEnrichResult(parts.join(". "));
      }
      loadHistory();
    } catch (err) {
      setEnrichResult(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setEnriching(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* CSV Export */}
      <div>
        <h4 className="text-sm font-medium text-slate-700 mb-2">Export Data</h4>
        <button
          onClick={exportCsv}
          disabled={exporting}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Download size={14} /> {exporting ? "Exporting..." : "Export Projects CSV"}
        </button>
        <p className="text-xs text-slate-400 mt-1">Download all projects as a CSV file</p>
      </div>

      {/* Full Data Pull + Developer Enrichment */}
      <div>
        <h4 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
          <Users size={14} /> Full Data Pull + Developer Enrichment
        </h4>
        <p className="text-sm text-slate-500 mb-3">
          Pulls all permits from 2020-present (new dataset) AND cross-references with the old LADBS dataset
          that has contractor names, applicant names, and addresses. Automatically creates developer profiles.
        </p>
        <button
          onClick={runEnrichment}
          disabled={enriching}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
        >
          <RefreshCw size={14} className={enriching ? "animate-spin" : ""} />
          {enriching ? "Pulling data & enriching..." : "Run Full Data Pull + Enrich"}
        </button>
        {enrichResult && (
          <p className={`text-sm mt-2 ${enrichResult.startsWith("Error") ? "text-red-600" : "text-green-600"}`}>
            {enrichResult}
          </p>
        )}
        <p className="text-xs text-slate-400 mt-1">This may take several minutes as it pulls thousands of records from both datasets</p>
      </div>

      {/* Scrape History */}
      <div>
        <h4 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
          <Database size={14} /> Scrape History
        </h4>
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Source</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Found</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">New</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Updated</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Started</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {scrapeHistory.map((run) => (
                <tr key={run.id}>
                  <td className="px-4 py-2 text-sm text-slate-900 uppercase">{run.source}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                      run.status === "completed" ? "bg-green-100 text-green-700" :
                      run.status === "running" ? "bg-blue-100 text-blue-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {run.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm text-slate-600">{run.recordsFound}</td>
                  <td className="px-4 py-2 text-sm text-slate-600">{run.recordsNew}</td>
                  <td className="px-4 py-2 text-sm text-slate-600">{run.recordsUpdated}</td>
                  <td className="px-4 py-2 text-sm text-slate-500">
                    {format(new Date(run.startedAt), "MMM d, yyyy h:mm a")}
                  </td>
                </tr>
              ))}
              {scrapeHistory.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-sm">No scrape history yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
