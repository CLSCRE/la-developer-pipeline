"use client";

import { useEffect, useState, useCallback } from "react";
import { ProjectsTable } from "../../components/ProjectsTable";
import { FilterBar, Filters } from "../../components/FilterBar";
import { ScrapeButton } from "../../components/ScrapeButton";

export default function ProjectsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [projects, setProjects] = useState<any[]>([]);
  const [zones, setZones] = useState<string[]>([]);
  const [filters, setFilters] = useState<Filters>({
    search: "",
    permitType: "",
    pipelineStage: "",
    zoneCode: "",
    minValuation: "",
    maxValuation: "",
  });

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
    setZones(data.zones);
  }, [filters]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
          <p className="text-sm text-slate-500 mt-1">All tracked construction permits</p>
        </div>
        <ScrapeButton onComplete={fetchProjects} />
      </div>

      <FilterBar filters={filters} onChange={setFilters} zones={zones} />
      <ProjectsTable projects={projects} />
    </div>
  );
}
