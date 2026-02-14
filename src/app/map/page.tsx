"use client";

import { useEffect, useState } from "react";
import { MapView } from "../../components/MapView";

export default function MapPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/projects?limit=50000")
      .then((res) => res.json())
      .then((data) => setProjects(data.projects));
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Map View</h1>
        <p className="text-sm text-slate-500 mt-1">All projects with location data</p>
      </div>
      <MapView projects={projects} />
    </div>
  );
}
