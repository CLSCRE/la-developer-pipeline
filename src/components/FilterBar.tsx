"use client";

import { Search, X } from "lucide-react";

export interface Filters {
  search: string;
  permitType: string;
  pipelineStage: string;
  zoneCode: string;
  minValuation: string;
  maxValuation: string;
}

interface FilterBarProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  zones: string[];
}

export function FilterBar({ filters, onChange, zones }: FilterBarProps) {
  const update = (key: keyof Filters, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  const clearAll = () => {
    onChange({
      search: "",
      permitType: "",
      pipelineStage: "",
      zoneCode: "",
      minValuation: "",
      maxValuation: "",
    });
  };

  const hasFilters = Object.values(filters).some((v) => v !== "");

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Filters</h3>
        {hasFilters && (
          <button onClick={clearAll} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
            <X size={12} /> Clear all
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="col-span-2 md:col-span-1 lg:col-span-2 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search address, permit, owner..."
            value={filters.search}
            onChange={(e) => update("search", e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filters.permitType}
          onChange={(e) => update("permitType", e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Types</option>
          <option value="Bldg-New">New Construction</option>
          <option value="Bldg-Alter/Repair">Alteration/Repair</option>
        </select>
        <select
          value={filters.pipelineStage}
          onChange={(e) => update("pipelineStage", e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Stages</option>
          <option value="entitlement">Entitlement</option>
          <option value="permitted">Permitted</option>
          <option value="construction">Construction</option>
          <option value="completed">Completed</option>
        </select>
        <select
          value={filters.zoneCode}
          onChange={(e) => update("zoneCode", e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Zones</option>
          {zones.map((z) => (
            <option key={z} value={z}>{z}</option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Min valuation"
          value={filters.minValuation}
          onChange={(e) => update("minValuation", e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
}
