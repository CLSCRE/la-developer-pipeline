"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { LeadScoreBadge } from "@/components/LeadScoreBadge";
import { ScrapeButton } from "@/components/ScrapeButton";
import { EnrichButton } from "@/components/EnrichButton";
import {
  Flame, DollarSign, Users, TrendingUp, Clock, ArrowRight, Building2, Mail, Phone, MessageSquare,
  Rocket, Loader2, CheckCircle2,
} from "lucide-react";

interface DashboardData {
  cards: {
    hotLeads: number;
    pipelineValue: number;
    uncontactedHotLeads: number;
    totalOpportunity: number;
  };
  topHotLeads: {
    id: string;
    name: string;
    leadScore: number | null;
    leadScoreData: { reasoning: string } | null;
    totalValuation: number;
    projectCount: number;
    hasNewConstruction: boolean;
    contacted: boolean;
  }[];
  pipelineMovers: {
    id: string;
    address: string;
    permitType: string;
    pipelineStage: string;
    pipelineSubstage: string | null;
    valuation: number | null;
    developer: { id: string; name: string } | null;
    updatedAt: string;
  }[];
  financingBreakdown: {
    predevelopment: number;
    construction: number;
    bridge: number;
    permanent: number;
  };
  recentActivity: {
    id: string;
    type: string;
    subject: string | null;
    developer: { id: string; name: string };
    createdAt: string;
  }[];
}

interface ScrapeRun {
  id: string;
  source: string;
  status: string;
  startedAt: string;
}

function formatVal(val: number): string {
  if (val >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(1)}B`;
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
  return `$${val.toLocaleString()}`;
}

const substageLabels: Record<string, string> = {
  issued: "Just Issued",
  ready_to_issue: "Ready to Issue",
  pc_approved: "PC Approved",
  plan_check: "Plan Check",
  submitted: "Submitted",
  under_inspection: "Under Inspection",
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [scrapeHistory, setScrapeHistory] = useState<ScrapeRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [populating, setPopulating] = useState(false);
  const [populateResult, setPopulateResult] = useState<string | null>(null);

  const fetchDashboard = async () => {
    const [dashRes, scrapeRes] = await Promise.all([
      fetch("/api/leads/dashboard"),
      fetch("/api/scrape/history"),
    ]);
    const dashData = await dashRes.json();
    const scrapeData = await scrapeRes.json();
    setData(dashData);
    setScrapeHistory(scrapeData);
    setLoading(false);
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const lastScrape = scrapeHistory[0];

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 bg-slate-200 rounded w-1/3 animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-slate-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { cards, topHotLeads, pipelineMovers, financingBreakdown, recentActivity } = data;

  const pipelineEmpty = cards.hotLeads === 0 && topHotLeads.length === 0;

  const populatePipeline = async () => {
    setPopulating(true);
    setPopulateResult(null);
    try {
      const res = await fetch("/api/scrape/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullScrape: true }),
      });
      const result = await res.json();
      if (res.ok) {
        const totalNew = (result.issued?.recordsNew || 0) + (result.submitted?.recordsNew || 0);
        const totalUpdated = (result.issued?.recordsUpdated || 0) + (result.submitted?.recordsUpdated || 0);
        const devsCreated = result.enrichment?.developersCreated || 0;
        const scoresUpdated = result.scores?.updated || 0;
        setPopulateResult(
          `${totalNew} new permits, ${totalUpdated} updated, ${devsCreated} developers created, ${scoresUpdated} lead scores computed`
        );
        await fetchDashboard();
      } else {
        setPopulateResult(`Error: ${result.error || "Failed to populate"}`);
      }
    } catch {
      setPopulateResult("Network error — check your connection");
    } finally {
      setPopulating(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Construction financing opportunities</p>
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
          <ScrapeButton onComplete={fetchDashboard} />
          <EnrichButton onComplete={fetchDashboard} />
        </div>
      </div>

      {/* Get Started Card — shown when pipeline is empty */}
      {pipelineEmpty && !populateResult && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-8 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-blue-100">
              <Rocket size={28} className="text-blue-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-slate-900">Get Started</h2>
              <p className="text-sm text-slate-600 mt-1">
                Your pipeline is empty. Run the first full scrape to pull in LA building permits,
                auto-create developer profiles, and compute lead scores.
              </p>
              <button
                onClick={populatePipeline}
                disabled={populating}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {populating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Populating pipeline... this may take a few minutes
                  </>
                ) : (
                  <>
                    <Rocket size={16} />
                    Populate Pipeline
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Populate Result */}
      {populateResult && (
        <div className={`rounded-xl border p-4 shadow-sm flex items-center gap-3 ${
          populateResult.startsWith("Error") || populateResult.startsWith("Network")
            ? "bg-red-50 border-red-200"
            : "bg-green-50 border-green-200"
        }`}>
          <CheckCircle2 size={20} className={
            populateResult.startsWith("Error") || populateResult.startsWith("Network")
              ? "text-red-500"
              : "text-green-500"
          } />
          <p className="text-sm text-slate-700">{populateResult}</p>
        </div>
      )}

      {/* Row 1 — Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <div className="p-2 rounded-lg bg-red-50"><Flame size={16} className="text-red-500" /></div>
            Hot Leads
          </div>
          <p className="text-3xl font-bold text-slate-900">{cards.hotLeads}</p>
          <p className="text-xs text-slate-400 mt-1">Score 70+</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <div className="p-2 rounded-lg bg-blue-50"><TrendingUp size={16} className="text-blue-500" /></div>
            Pipeline Value
          </div>
          <p className="text-3xl font-bold text-slate-900">{formatVal(cards.pipelineValue)}</p>
          <p className="text-xs text-slate-400 mt-1">Active projects</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <div className="p-2 rounded-lg bg-amber-50"><Users size={16} className="text-amber-500" /></div>
            Uncontacted Hot
          </div>
          <p className="text-3xl font-bold text-slate-900">{cards.uncontactedHotLeads}</p>
          <p className="text-xs text-slate-400 mt-1">Never reached out</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <div className="p-2 rounded-lg bg-green-50"><DollarSign size={16} className="text-green-500" /></div>
            Total Opportunity
          </div>
          <p className="text-3xl font-bold text-slate-900">{formatVal(cards.totalOpportunity)}</p>
          <p className="text-xs text-slate-400 mt-1">All permit valuations</p>
        </div>
      </div>

      {/* Row 2 — Hot Leads Table + Pipeline Movers */}
      <div className="grid grid-cols-2 gap-6">
        {/* Top 5 Hot Leads */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Top Hot Leads</h3>
            <Link href="/leads?filter=hot" className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {topHotLeads.length > 0 ? (
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Score</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Developer</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-slate-500">Value</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-slate-500">Projects</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topHotLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5">
                      <LeadScoreBadge score={lead.leadScore} size="sm" />
                    </td>
                    <td className="px-4 py-2.5">
                      <Link href={`/developers/${lead.id}`} className="text-sm font-medium text-blue-600 hover:text-blue-800">
                        {lead.name}
                      </Link>
                      {!lead.contacted && (
                        <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded">NEW</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-right font-medium text-green-600">
                      {formatVal(lead.totalValuation)}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-center text-slate-600">
                      {lead.projectCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="px-5 py-8 text-center text-sm text-slate-400">
              No hot leads yet. Run a scrape and compute scores.
            </div>
          )}
        </div>

        {/* Pipeline Movers */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-700">Pipeline Movers</h3>
            <p className="text-xs text-slate-400 mt-0.5">Recently advanced permits</p>
          </div>
          {pipelineMovers.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {pipelineMovers.slice(0, 5).map((p) => (
                <div key={p.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <Link href={`/projects/${p.id}`} className="text-sm font-medium text-blue-600 hover:text-blue-800 truncate block max-w-[200px]">
                      {p.address}
                    </Link>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        p.pipelineStage === "permitted" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
                      }`}>
                        {p.pipelineSubstage ? substageLabels[p.pipelineSubstage] || p.pipelineSubstage : p.pipelineStage}
                      </span>
                      {p.developer && (
                        <Link href={`/developers/${p.developer.id}`} className="text-xs text-slate-400 hover:text-slate-600">
                          {p.developer.name}
                        </Link>
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-medium text-slate-600">
                    {p.valuation ? formatVal(p.valuation) : "—"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-8 text-center text-sm text-slate-400">
              No recent pipeline movement
            </div>
          )}
        </div>
      </div>

      {/* Row 3 — Financing Stage Breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Opportunity by Financing Stage</h3>
        <div className="grid grid-cols-4 gap-4">
          {[
            { key: "predevelopment", label: "Predevelopment", color: "bg-amber-500", desc: "Entitlement-stage permits" },
            { key: "construction", label: "Construction", color: "bg-blue-500", desc: "Issued permits, active builds" },
            { key: "bridge", label: "Bridge", color: "bg-violet-500", desc: "Near-completion, CofO pending" },
            { key: "permanent", label: "Permanent", color: "bg-green-500", desc: "Completed projects" },
          ].map((stage) => {
            const val = financingBreakdown[stage.key as keyof typeof financingBreakdown] || 0;
            const total = Object.values(financingBreakdown).reduce((a, b) => a + b, 0);
            const pct = total > 0 ? (val / total) * 100 : 0;
            return (
              <div key={stage.key} className="text-center">
                <div className="relative w-full h-2 bg-slate-100 rounded-full mb-3">
                  <div className={`absolute h-2 rounded-full ${stage.color}`} style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xl font-bold text-slate-900">{formatVal(val)}</p>
                <p className="text-sm font-medium text-slate-700 mt-1">{stage.label}</p>
                <p className="text-xs text-slate-400">{stage.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Row 4 — Recent Activity */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-700">Recent Activity</h3>
        </div>
        {recentActivity.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="px-5 py-3 flex items-center gap-3">
                <div className={`p-1.5 rounded-lg ${
                  activity.type === "email" ? "bg-blue-50" : activity.type === "phone" ? "bg-green-50" : "bg-slate-50"
                }`}>
                  {activity.type === "email" ? (
                    <Mail size={14} className="text-blue-500" />
                  ) : activity.type === "phone" ? (
                    <Phone size={14} className="text-green-500" />
                  ) : activity.type === "linkedin" ? (
                    <Building2 size={14} className="text-blue-700" />
                  ) : (
                    <MessageSquare size={14} className="text-slate-500" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-700">
                    <span className="capitalize">{activity.type}</span>
                    {activity.subject && <span className="text-slate-400"> — {activity.subject}</span>}
                  </p>
                  <Link href={`/developers/${activity.developer.id}`} className="text-xs text-blue-600 hover:text-blue-800">
                    {activity.developer.name}
                  </Link>
                </div>
                <span className="text-xs text-slate-400">
                  {format(new Date(activity.createdAt), "MMM d, h:mm a")}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 py-8 text-center text-sm text-slate-400">
            No outreach activity yet
          </div>
        )}
      </div>
    </div>
  );
}
