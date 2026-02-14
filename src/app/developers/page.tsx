"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, Plus, List, LayoutGrid, Mail } from "lucide-react";
import DevelopersList from "@/components/DevelopersList";
import DeveloperKanban from "@/components/DeveloperKanban";
import AddDeveloperModal from "@/components/AddDeveloperModal";
import BatchEmailModal from "@/components/BatchEmailModal";

const STAGES = [
  { key: "", label: "All Stages" },
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "in_discussion", label: "In Discussion" },
  { key: "proposal_sent", label: "Proposal Sent" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
  { key: "dormant", label: "Dormant" },
];

export default function DevelopersPage() {
  const [view, setView] = useState<"list" | "kanban">("list");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [developers, setDevelopers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("");
  const [sortField, setSortField] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [addOpen, setAddOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const fetchDevelopers = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (stage) params.set("stage", stage);
    params.set("sort", sortField);
    params.set("order", sortOrder);
    const res = await fetch(`/api/developers?${params}`);
    const data = await res.json();
    setDevelopers(data.developers || []);
    setTotal(data.total || 0);
  }, [search, stage, sortField, sortOrder]);

  useEffect(() => {
    fetchDevelopers();
  }, [fetchDevelopers]);

  const handleSort = (field: string) => {
    if (field === sortField) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const handleStageChange = async (id: string, newStage: string) => {
    await fetch(`/api/developers/${id}/stage`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: newStage }),
    });
    fetchDevelopers();
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === developers.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(developers.map((d) => d.id)));
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Developers</h1>
          <p className="text-sm text-slate-500 mt-1">{total} developers in CRM</p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button
              onClick={() => setBatchOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              <Mail size={14} /> Email Selected ({selected.size})
            </button>
          )}
          <button
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
          >
            <Plus size={14} /> Add Developer
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search developers..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={stage}
          onChange={(e) => setStage(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {STAGES.map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
        <div className="flex border border-slate-200 rounded-lg overflow-hidden ml-auto">
          <button
            onClick={() => setView("list")}
            className={`px-3 py-2 text-sm ${view === "list" ? "bg-blue-50 text-blue-600" : "text-slate-500 hover:bg-slate-50"}`}
          >
            <List size={16} />
          </button>
          <button
            onClick={() => setView("kanban")}
            className={`px-3 py-2 text-sm ${view === "kanban" ? "bg-blue-50 text-blue-600" : "text-slate-500 hover:bg-slate-50"}`}
          >
            <LayoutGrid size={16} />
          </button>
        </div>
      </div>

      {view === "list" ? (
        <DevelopersList
          developers={developers}
          selected={selected}
          onToggleSelect={toggleSelect}
          onToggleAll={toggleAll}
          sortField={sortField}
          sortOrder={sortOrder}
          onSort={handleSort}
        />
      ) : (
        <DeveloperKanban developers={developers} onStageChange={handleStageChange} />
      )}

      <AddDeveloperModal open={addOpen} onClose={() => setAddOpen(false)} onCreated={fetchDevelopers} />
      <BatchEmailModal
        open={batchOpen}
        onClose={() => { setBatchOpen(false); setSelected(new Set()); }}
        developerIds={Array.from(selected)}
      />
    </div>
  );
}
