"use client";

import { useEffect, useState, useCallback } from "react";
import { SummaryCards } from "../components/SummaryCards";
import { ProjectsTable } from "../components/ProjectsTable";
import { FilterBar, Filters } from "../components/FilterBar";
import { MapView } from "../components/MapView";
import { ScrapeButton } from "../components/ScrapeButton";
import { EnrichButton } from "../components/EnrichButton";
import { format } from "date-fns";
import { Clock, Database } from "lucide-react";

interface Stats {
  total: number;
  entitlement: number;
  permitted: number;
  construction: number;
  completed: number;
  totalValuation: number;
}

interface ScrapeRun {
  id: string;
  source: string;
  status: string;
  recordsFound: number;
  recordsNew: number;
  recordsUpdated: number;
  startedAt: string;
  completedAt: string | null;
}

export default function DashboardPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [projects, setProjects] = useState<any[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, entitlement: 0, permitted: 0, construction: 0, completed: 0, totalValuation: 0 });
  const [zones, setZones] = useState<string[]>([]);
  const [scrapeHistory, setScrapeHistory] = useState<ScrapeRun[]>([]);
  const [filters, setFilters] = useState<Filters>({
    search: "",
    permitType: "",
    pipelineStage: "",
    zoneCode: "",
    minValuation: "",
    maxValuation: "",
  });
  const [viewMode, setViewMode] = useState<"table" | "map">("table");

  const fetchProjects = useCallback(async () => {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.permitType) params.set("permitType", filters.permitType);
    if (filters.pipelineStage) params.set("pipelineStage", filters.pipelineStage);
    if (filters.zoneCode) params.set("zoneCode", filters.zoneCode);
    if (filters.minValuation) params.set("minValuation", filters.minValuation);

    const res = await fetch(`/api/projects?${params.toString()}`);
    const data = await res.json();
    setProjects(data.projects);
    setStats(data.stats);
    setZones(data.zones);
  }, [filters]);

  const fetchScrapeHistory = async () => {
    const res = await fetch("/api/scrape/history");
    const data = await res.json();
    setScrapeHistory(data);
  };

  useEffect(() => {
    fetchProjects();
    fetchScrapeHistory();
  }, [fetchProjects]);

  const lastScrape = scrapeHistory[0];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">LA construction permits and developer pipeline</p>
        </div>
        <div className="flex items-center gap-4">
          {lastScrape && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Clock size={12} />
              Last scrape: {format(new Date(lastScrape.startedAt), "MMM d, h:mm a")}
              <span className={`inline-flex px-1.5 py-0.5 rounded text-xs ${lastScrape.status === "completed" ? "bg-green-100 text-green-700" : lastScrape.status === "failed" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                {lastScrape.status}
              </span>
            </div>
          )}
          <ScrapeButton onComplete={() => { fetchProjects(); fetchScrapeHistory(); }} />
          <EnrichButton onComplete={fetchProjects} />
        </div>
      </div>

      <SummaryCards {...stats} />

      <FilterBar filters={filters} onChange={setFilters} zones={zones} />

      <div className="flex items-center gap-2">
        <button
          onClick={() => setViewMode("table")}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${viewMode === "table" ? "bg-blue-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}
        >
          <Database size={14} className="inline mr-1.5" />
          Table
        </button>
        <button
          onClick={() => setViewMode("map")}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${viewMode === "map" ? "bg-blue-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}
        >
          <svg className="inline mr-1.5 w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z"/><path d="M8 2v16"/><path d="M16 6v16"/></svg>
          Map
        </button>
      </div>

      {viewMode === "table" ? (
        <ProjectsTable projects={projects} />
      ) : (
        <MapView projects={projects} />
      )}
    </div>
  );
}
