"use client";

import { useEffect, useState } from "react";
import { BarChart3, Users, Building2, Mail, TrendingUp } from "lucide-react";
import FunnelChart from "@/components/charts/FunnelChart";
import BarChart from "@/components/charts/BarChart";
import LineChart from "@/components/charts/LineChart";
import ActivityTimeline from "@/components/charts/ActivityTimeline";
import Link from "next/link";

const projectStageColors: Record<string, string> = {
  entitlement: "#f59e0b",
  permitted: "#3b82f6",
  construction: "#8b5cf6",
  completed: "#22c55e",
};

const devStageColors: Record<string, string> = {
  new: "#94a3b8",
  contacted: "#3b82f6",
  in_discussion: "#f59e0b",
  proposal_sent: "#8b5cf6",
  won: "#22c55e",
  lost: "#ef4444",
  dormant: "#cbd5e1",
};

export default function AnalyticsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4" />
          <div className="grid grid-cols-3 gap-4">
            <div className="h-24 bg-slate-200 rounded" />
            <div className="h-24 bg-slate-200 rounded" />
            <div className="h-24 bg-slate-200 rounded" />
          </div>
          <div className="h-64 bg-slate-200 rounded" />
        </div>
      </div>
    );
  }

  const funnelData = Object.entries(data.projectFunnel || {}).map(([label, value]) => ({
    label: label.charAt(0).toUpperCase() + label.slice(1),
    value: value as number,
    color: projectStageColors[label] || "#94a3b8",
  }));

  const devFunnelData = Object.entries(data.devFunnel || {}).map(([label, value]) => ({
    label: label.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    value: value as number,
    color: devStageColors[label] || "#94a3b8",
  }));

  const zoneData = (data.topZones || []).map(([label, value]: [string, number]) => ({
    label,
    value,
  }));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
        <p className="text-sm text-slate-500 mt-1">Pipeline funnel, outreach metrics, and trends</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <Building2 size={16} /> <span className="text-xs font-medium uppercase">Projects</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{data.totals.projects}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <Users size={16} /> <span className="text-xs font-medium uppercase">Developers</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{data.totals.developers}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <Mail size={16} /> <span className="text-xs font-medium uppercase">Outreach</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{data.totals.outreach}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <TrendingUp size={16} /> <span className="text-xs font-medium uppercase">Reply Rate</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {data.totals.outreach > 0
              ? `${Math.round(((data.outreachByStatus?.replied || 0) / data.totals.outreach) * 100)}%`
              : "—"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Pipeline Funnel */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-4">
            <BarChart3 size={16} /> Project Pipeline
          </h3>
          <FunnelChart data={funnelData} />
        </div>

        {/* Developer CRM Funnel */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-4">
            <Users size={16} /> Developer Pipeline
          </h3>
          <FunnelChart data={devFunnelData} />
        </div>

        {/* Top Zones */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Top Zones</h3>
          <BarChart data={zoneData} color="#8b5cf6" />
        </div>

        {/* Monthly Permit Trend */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Monthly Permit Trend</h3>
          <LineChart data={data.monthlyTrend || []} color="#3b82f6" />
        </div>

        {/* Top Developers */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-700">Top Developers</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {(data.topDevelopers || []).map((dev: { id: string; name: string; projects: number; outreach: number }, i: number) => (
              <div key={dev.id} className="px-5 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-slate-400 w-5">{i + 1}</span>
                  <Link href={`/developers/${dev.id}`} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                    {dev.name}
                  </Link>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span>{dev.projects} projects</span>
                  <span>{dev.outreach} outreach</span>
                </div>
              </div>
            ))}
            {(!data.topDevelopers || data.topDevelopers.length === 0) && (
              <div className="px-5 py-8 text-center text-slate-400 text-sm">No developers yet</div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-700">Recent Activity</h3>
          </div>
          <ActivityTimeline outreach={data.recentActivity || []} scrapes={data.recentScrapes || []} />
        </div>
      </div>
    </div>
  );
}
