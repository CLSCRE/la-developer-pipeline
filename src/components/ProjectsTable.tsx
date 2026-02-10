"use client";

import Link from "next/link";
import { format } from "date-fns";
import { ArrowUpDown, ExternalLink } from "lucide-react";
import { useState } from "react";

interface Project {
  id: string;
  permitNumber: string;
  permitType: string;
  status: string;
  pipelineStage: string;
  financingType: string;
  address: string;
  valuation: number | null;
  units: number | null;
  zoneCode: string | null;
  ownerName: string | null;
  permitDate: string | null;
}

interface ProjectsTableProps {
  projects: Project[];
}

const stageColors: Record<string, string> = {
  entitlement: "bg-amber-100 text-amber-800",
  permitted: "bg-blue-100 text-blue-800",
  construction: "bg-violet-100 text-violet-800",
  completed: "bg-green-100 text-green-800",
};

const stageLabels: Record<string, string> = {
  entitlement: "Entitlement",
  permitted: "Permitted",
  construction: "Construction",
  completed: "Completed",
};

function formatCurrency(val: number | null): string {
  if (val === null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(val);
}

type SortKey = "address" | "permitType" | "pipelineStage" | "valuation" | "permitDate" | "ownerName";

export function ProjectsTable({ projects }: ProjectsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("permitDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sorted = [...projects].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    switch (sortKey) {
      case "valuation":
        return ((a.valuation || 0) - (b.valuation || 0)) * dir;
      case "permitDate":
        return ((a.permitDate || "") > (b.permitDate || "") ? 1 : -1) * dir;
      default:
        return ((a[sortKey] || "") > (b[sortKey] || "") ? 1 : -1) * dir;
    }
  });

  const SortHeader = ({ label, keyName }: { label: string; keyName: SortKey }) => (
    <th
      className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 select-none"
      onClick={() => toggleSort(keyName)}
    >
      <span className="flex items-center gap-1">
        {label}
        <ArrowUpDown size={12} className={sortKey === keyName ? "text-blue-600" : "text-slate-300"} />
      </span>
    </th>
  );

  if (projects.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
        <p className="text-slate-500">No projects found. Run a scrape to populate data.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <SortHeader label="Address" keyName="address" />
              <SortHeader label="Type" keyName="permitType" />
              <SortHeader label="Stage" keyName="pipelineStage" />
              <SortHeader label="Valuation" keyName="valuation" />
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Units</th>
              <SortHeader label="Owner" keyName="ownerName" />
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Zone</th>
              <SortHeader label="Date" keyName="permitDate" />
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.map((project) => (
              <tr key={project.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/projects/${project.id}`} className="text-sm font-medium text-slate-900 hover:text-blue-600">
                    {project.address}
                  </Link>
                  <p className="text-xs text-slate-400 mt-0.5">#{project.permitNumber}</p>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {project.permitType === "Bldg-New" ? "New" : "Alter"}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${stageColors[project.pipelineStage] || "bg-slate-100 text-slate-600"}`}>
                    {stageLabels[project.pipelineStage] || project.pipelineStage}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600 tabular-nums">
                  {formatCurrency(project.valuation)}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {project.units ?? "—"}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600 max-w-[200px] truncate">
                  {project.ownerName || "—"}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {project.zoneCode || "—"}
                </td>
                <td className="px-4 py-3 text-sm text-slate-500">
                  {project.permitDate ? format(new Date(project.permitDate), "MM/dd/yyyy") : "—"}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/projects/${project.id}`} className="text-slate-400 hover:text-blue-600">
                    <ExternalLink size={14} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
        Showing {projects.length} project{projects.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}
