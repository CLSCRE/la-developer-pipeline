"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { LeadScoreBadge } from "@/components/LeadScoreBadge";
import { Flame, Users, DollarSign, Mail, Phone, RefreshCw, Send, X } from "lucide-react";
import LeadOutreachModal from "@/components/LeadOutreachModal";
import BatchEmailModal from "@/components/BatchEmailModal";

interface LeadScoreData {
  opportunity: number;
  timing: number;
  quality: number;
  reachability: number;
  total: number;
  reasoning: string;
}

interface LeadProject {
  id: string;
  permitType: string;
  pipelineStage: string;
  pipelineSubstage: string | null;
  financingType: string;
  valuation: number | null;
  address: string;
}

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  leadScore: number | null;
  leadScoreData: LeadScoreData | null;
  totalValuation: number;
  hotProjects: number;
  pipelineProjects: number;
  totalProjects: number;
  lastOutreach: { date: string; type: string } | null;
  projects: LeadProject[];
}

interface Stats {
  hotCount: number;
  pipelineCount: number;
  uncontactedHotCount: number;
  totalOpportunity: number;
  totalLeads: number;
}

function formatVal(val: number): string {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
  return `$${val.toLocaleString()}`;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<Stats>({ hotCount: 0, pipelineCount: 0, uncontactedHotCount: 0, totalOpportunity: 0, totalLeads: 0 });
  const [filter, setFilter] = useState<"hot" | "pipeline" | "all">("hot");
  const [computing, setComputing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Selection state
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());

  // Modal state
  const [outreachLead, setOutreachLead] = useState<Lead | null>(null);
  const [batchModalOpen, setBatchModalOpen] = useState(false);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/leads?filter=${filter}`);
    const data = await res.json();
    setLeads(data.leads);
    setStats(data.stats);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchLeads();
    setSelectedLeads(new Set());
  }, [fetchLeads]);

  const recomputeScores = async () => {
    setComputing(true);
    await fetch("/api/leads/compute", { method: "POST" });
    await fetchLeads();
    setComputing(false);
  };

  const toggleSelect = (id: string) => {
    setSelectedLeads((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedLeads(new Set());

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Leads</h1>
          <p className="text-sm text-slate-500 mt-1">Prioritized developer leads for construction financing</p>
        </div>
        <button
          onClick={recomputeScores}
          disabled={computing}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw size={14} className={computing ? "animate-spin" : ""} />
          {computing ? "Computing..." : "Recompute Scores"}
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <DollarSign size={14} className="text-green-500" /> Total Opportunity
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatVal(stats.totalOpportunity)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Flame size={14} className="text-red-500" /> Hot Leads
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.hotCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Users size={14} className="text-amber-500" /> Uncontacted Hot
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.uncontactedHotCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Users size={14} className="text-blue-500" /> Total Scored
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.totalLeads}</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {[
          { key: "hot" as const, label: "Hot Leads", count: stats.hotCount },
          { key: "pipeline" as const, label: "Pipeline", count: stats.pipelineCount },
          { key: "all" as const, label: "All", count: stats.totalLeads },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              filter === tab.key
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-xs text-slate-400">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* Bulk Action Bar */}
      {selectedLeads.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-medium text-blue-800">
            {selectedLeads.size} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setBatchModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Mail size={14} /> Email Selected
            </button>
            <button
              onClick={clearSelection}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-white"
            >
              <X size={14} /> Clear
            </button>
          </div>
        </div>
      )}

      {/* Lead Cards */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse">
              <div className="h-6 bg-slate-200 rounded w-1/3 mb-2" />
              <div className="h-4 bg-slate-200 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : leads.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-400">No leads found. Run a scrape and compute scores to populate leads.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => (
            <div key={lead.id} className={`bg-white rounded-xl border p-5 shadow-sm hover:shadow-md transition-shadow ${
              selectedLeads.has(lead.id) ? "border-blue-400 ring-1 ring-blue-200" : "border-slate-200"
            }`}>
              <div className="flex items-start gap-4">
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={selectedLeads.has(lead.id)}
                  onChange={() => toggleSelect(lead.id)}
                  className="mt-2 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <LeadScoreBadge score={lead.leadScore} size="lg" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/developers/${lead.id}`}
                      className="text-lg font-semibold text-slate-900 hover:text-blue-600 truncate"
                    >
                      {lead.name}
                    </Link>
                    <span className="text-lg font-bold text-green-600">{formatVal(lead.totalValuation)}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                    <span>
                      {lead.hotProjects > 0 && (
                        <span className="text-red-600 font-medium">{lead.hotProjects} hot</span>
                      )}
                      {lead.hotProjects > 0 && lead.pipelineProjects > 0 && " / "}
                      {lead.pipelineProjects > 0 && (
                        <span className="text-amber-600">{lead.pipelineProjects} pipeline</span>
                      )}
                      {(lead.hotProjects > 0 || lead.pipelineProjects > 0) && " / "}
                      {lead.totalProjects} total projects
                    </span>
                    {lead.lastOutreach ? (
                      <span>Last {lead.lastOutreach.type}: {new Date(lead.lastOutreach.date).toLocaleDateString()}</span>
                    ) : (
                      <span className="text-green-600 font-medium">Never contacted</span>
                    )}
                  </div>
                  {lead.leadScoreData && (
                    <p className="mt-2 text-sm text-slate-600 italic">{lead.leadScoreData.reasoning}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setOutreachLead(lead)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                    title="Start Outreach"
                  >
                    <Send size={12} /> Start Outreach
                  </button>
                  {lead.email && (
                    <a
                      href={`mailto:${lead.email}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      title={lead.email}
                    >
                      <Mail size={12} /> Email
                    </a>
                  )}
                  {lead.phone && (
                    <a
                      href={`tel:${lead.phone}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
                      title={lead.phone}
                    >
                      <Phone size={12} /> Call
                    </a>
                  )}
                </div>
              </div>
              {/* Score Breakdown */}
              {lead.leadScoreData && (
                <div className="mt-3 pt-3 border-t border-slate-100 flex gap-6 text-xs text-slate-400">
                  <span>Opportunity: <b className="text-slate-600">{lead.leadScoreData.opportunity}/40</b></span>
                  <span>Timing: <b className="text-slate-600">{lead.leadScoreData.timing}/30</b></span>
                  <span>Quality: <b className="text-slate-600">{lead.leadScoreData.quality}/20</b></span>
                  <span>Reachability: <b className="text-slate-600">{lead.leadScoreData.reachability}/10</b></span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Outreach Modal */}
      {outreachLead && (
        <LeadOutreachModal
          open={!!outreachLead}
          onClose={() => setOutreachLead(null)}
          developerId={outreachLead.id}
          developerName={outreachLead.name}
          leadScore={outreachLead.leadScore}
          projects={outreachLead.projects}
          onSent={fetchLeads}
        />
      )}

      {/* Batch Email Modal */}
      <BatchEmailModal
        open={batchModalOpen}
        onClose={() => {
          setBatchModalOpen(false);
          clearSelection();
          fetchLeads();
        }}
        developerIds={Array.from(selectedLeads)}
      />
    </div>
  );
}
