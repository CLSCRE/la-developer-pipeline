"use client";

import { Building2, FileCheck, HardHat, CheckCircle2, DollarSign } from "lucide-react";

interface SummaryCardsProps {
  total: number;
  entitlement: number;
  permitted: number;
  construction: number;
  completed: number;
  totalValuation: number;
}

const cards = [
  { key: "total" as const, label: "Total Projects", icon: Building2, color: "bg-blue-500" },
  { key: "entitlement" as const, label: "Entitlement", icon: FileCheck, color: "bg-amber-500" },
  { key: "permitted" as const, label: "Permitted", icon: HardHat, color: "bg-blue-500" },
  { key: "construction" as const, label: "Construction", icon: HardHat, color: "bg-violet-500" },
  { key: "completed" as const, label: "Completed", icon: CheckCircle2, color: "bg-green-500" },
];

function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

export function SummaryCards(props: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.key} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className={`${card.color} p-1.5 rounded-lg`}>
                <Icon size={14} className="text-white" />
              </div>
              <span className="text-xs font-medium text-slate-500">{card.label}</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{props[card.key].toLocaleString()}</p>
          </div>
        );
      })}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <div className="bg-emerald-500 p-1.5 rounded-lg">
            <DollarSign size={14} className="text-white" />
          </div>
          <span className="text-xs font-medium text-slate-500">Total Valuation</span>
        </div>
        <p className="text-2xl font-bold text-slate-900">{formatCurrency(props.totalValuation)}</p>
      </div>
    </div>
  );
}
