"use client";

import { ArrowUpDown } from "lucide-react";
import Link from "next/link";
import { LeadScoreBadge } from "./LeadScoreBadge";

interface Developer {
  id: string;
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  pipelineStage: string;
  leadScore?: number | null;
  createdAt: string;
  _count: { projects: number; outreachLogs: number };
  tags: { id: string; tag: string }[];
  projects?: { valuation: number | null }[];
}

interface DevelopersListProps {
  developers: Developer[];
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleAll: () => void;
  sortField: string;
  sortOrder: "asc" | "desc";
  onSort: (field: string) => void;
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

const stageLabels: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  in_discussion: "In Discussion",
  proposal_sent: "Proposal Sent",
  won: "Won",
  lost: "Lost",
  dormant: "Dormant",
};

function formatVal(val: number): string {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
  return `$${val.toLocaleString()}`;
}

export default function DevelopersList({
  developers,
  selected,
  onToggleSelect,
  onToggleAll,
  sortField,
  sortOrder,
  onSort,
}: DevelopersListProps) {
  const SortHeader = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700"
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        <ArrowUpDown size={12} className={sortField === field ? "text-blue-600" : "text-slate-300"} />
        {sortField === field && <span className="text-blue-600 text-[10px]">{sortOrder === "asc" ? "↑" : "↓"}</span>}
      </span>
    </th>
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 w-8">
                <input
                  type="checkbox"
                  checked={selected.size === developers.length && developers.length > 0}
                  onChange={onToggleAll}
                  className="rounded border-slate-300"
                />
              </th>
              <SortHeader field="leadScore">Score</SortHeader>
              <SortHeader field="name">Name</SortHeader>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Contact</th>
              <SortHeader field="pipelineStage">Stage</SortHeader>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Opportunity</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Projects</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tags</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {developers.map((dev) => {
              const totalVal = dev.projects
                ? dev.projects.reduce((sum, p) => sum + (p.valuation || 0), 0)
                : 0;
              return (
                <tr key={dev.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(dev.id)}
                      onChange={() => onToggleSelect(dev.id)}
                      className="rounded border-slate-300"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <LeadScoreBadge score={dev.leadScore ?? null} size="sm" />
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/developers/${dev.id}`} className="text-blue-600 hover:text-blue-800 font-medium text-sm">
                      {dev.name}
                    </Link>
                    {dev.company && <p className="text-xs text-slate-500">{dev.company}</p>}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {dev.email && <p>{dev.email}</p>}
                    {dev.phone && <p className="text-slate-400">{dev.phone}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${stageColors[dev.pipelineStage] || "bg-slate-100 text-slate-600"}`}>
                      {stageLabels[dev.pipelineStage] || dev.pipelineStage}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-green-600">
                    {totalVal > 0 ? formatVal(totalVal) : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{dev._count.projects}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {dev.tags.slice(0, 3).map((t) => (
                        <span key={t.id} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                          {t.tag}
                        </span>
                      ))}
                      {dev.tags.length > 3 && (
                        <span className="text-xs text-slate-400">+{dev.tags.length - 3}</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {developers.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                  No developers found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
