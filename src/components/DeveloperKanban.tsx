"use client";

import { useState } from "react";
import Link from "next/link";
import { GripVertical, Building2, Mail } from "lucide-react";

interface Developer {
  id: string;
  name: string;
  company?: string | null;
  email?: string | null;
  pipelineStage: string;
  _count: { projects: number; outreachLogs: number };
}

interface DeveloperKanbanProps {
  developers: Developer[];
  onStageChange: (id: string, stage: string) => void;
}

const STAGES = [
  { key: "new", label: "New", color: "border-t-slate-400" },
  { key: "contacted", label: "Contacted", color: "border-t-blue-500" },
  { key: "in_discussion", label: "In Discussion", color: "border-t-amber-500" },
  { key: "proposal_sent", label: "Proposal Sent", color: "border-t-violet-500" },
  { key: "won", label: "Won", color: "border-t-green-500" },
  { key: "lost", label: "Lost", color: "border-t-red-400" },
  { key: "dormant", label: "Dormant", color: "border-t-slate-300" },
];

export default function DeveloperKanban({ developers, onStageChange }: DeveloperKanbanProps) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const grouped: Record<string, Developer[]> = {};
  for (const s of STAGES) grouped[s.key] = [];
  for (const dev of developers) {
    if (grouped[dev.pipelineStage]) {
      grouped[dev.pipelineStage].push(dev);
    } else {
      grouped.new.push(dev);
    }
  }

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  };

  const handleDragOver = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTarget(stage);
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const handleDrop = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (id) {
      onStageChange(id, stage);
    }
    setDragId(null);
    setDropTarget(null);
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {STAGES.map((stage) => (
        <div
          key={stage.key}
          className={`flex-shrink-0 w-56 bg-slate-50 rounded-xl border border-slate-200 border-t-4 ${stage.color} ${
            dropTarget === stage.key ? "ring-2 ring-blue-400 bg-blue-50" : ""
          }`}
          onDragOver={(e) => handleDragOver(e, stage.key)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, stage.key)}
        >
          <div className="px-3 py-2 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-700 uppercase">{stage.label}</h3>
              <span className="text-xs text-slate-400 bg-white px-1.5 py-0.5 rounded-full">
                {grouped[stage.key].length}
              </span>
            </div>
          </div>
          <div className="p-2 space-y-2 min-h-[100px]">
            {grouped[stage.key].map((dev) => (
              <div
                key={dev.id}
                draggable
                onDragStart={(e) => handleDragStart(e, dev.id)}
                className={`bg-white rounded-lg border border-slate-200 p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow transition-shadow ${
                  dragId === dev.id ? "opacity-50" : ""
                }`}
              >
                <div className="flex items-start gap-2">
                  <GripVertical size={14} className="text-slate-300 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/developers/${dev.id}`}
                      className="text-sm font-medium text-slate-900 hover:text-blue-600 block truncate"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {dev.name}
                    </Link>
                    {dev.company && (
                      <p className="text-xs text-slate-500 truncate">{dev.company}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                      <span className="inline-flex items-center gap-0.5">
                        <Building2 size={10} /> {dev._count.projects}
                      </span>
                      <span className="inline-flex items-center gap-0.5">
                        <Mail size={10} /> {dev._count.outreachLogs}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
