"use client";

import { useState, useEffect } from "react";
import { X, Send } from "lucide-react";
import { LeadScoreBadge } from "./LeadScoreBadge";

interface Project {
  id: string;
  permitType: string;
  pipelineStage: string;
  pipelineSubstage: string | null;
  financingType: string;
  valuation: number | null;
  address: string;
}

interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
  stage: string;
  isDefault: boolean;
}

interface LeadOutreachModalProps {
  open: boolean;
  onClose: () => void;
  developerId: string;
  developerName: string;
  leadScore: number | null;
  projects: Project[];
  onSent?: () => void;
}

function formatVal(val: number): string {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
  return `$${val.toLocaleString()}`;
}

export default function LeadOutreachModal({
  open,
  onClose,
  developerId,
  developerName,
  leadScore,
  projects,
  onSent,
}: LeadOutreachModalProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    fetch("/api/templates")
      .then((r) => r.json())
      .then((data: Template[]) => {
        const tpls = Array.isArray(data) ? data : [];
        setTemplates(tpls);

        // Auto-select the best project (highest valuation with most actionable stage)
        const stageOrder = ["permitted", "construction", "entitlement", "completed"];
        const sorted = [...projects].sort((a, b) => {
          const aIdx = stageOrder.indexOf(a.pipelineStage);
          const bIdx = stageOrder.indexOf(b.pipelineStage);
          if (aIdx !== bIdx) return aIdx - bIdx;
          return (b.valuation || 0) - (a.valuation || 0);
        });
        const bestProject = sorted[0];
        if (bestProject) {
          setSelectedProject(bestProject.id);

          // Auto-select default template matching the best project's stage
          const matchingDefault = tpls.find(
            (t) => t.stage === bestProject.pipelineStage && t.isDefault
          );
          const matchingAny = tpls.find((t) => t.stage === bestProject.pipelineStage);
          const template = matchingDefault || matchingAny;
          if (template) {
            setSelectedTemplate(template.id);
            setSubject(template.subject);
            setBody(template.body);
          }
        }
      });

    return () => {
      setSubject("");
      setBody("");
      setSelectedTemplate("");
      setSelectedProject("");
      setResult(null);
    };
  }, [open, projects]);

  const applyTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    const tpl = templates.find((t) => t.id === templateId);
    if (tpl) {
      setSubject(tpl.subject);
      setBody(tpl.body);
    }
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) return;
    setSending(true);
    setResult(null);

    try {
      const res = await fetch("/api/outreach/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          developerId,
          projectId: selectedProject || undefined,
          subject,
          body,
          templateId: selectedTemplate || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(`Email ${data.status === "sent" ? "sent" : "logged as draft"}`);
        onSent?.();
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setResult(data.error || "Failed to send");
      }
    } catch {
      setResult("Network error");
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  const totalVal = projects.reduce((sum, p) => sum + (p.valuation || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Start Outreach</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Developer Context */}
          <div className="bg-slate-50 rounded-lg p-3 flex items-center gap-3">
            <LeadScoreBadge score={leadScore} size="sm" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-900">{developerName}</p>
              <p className="text-xs text-slate-500">
                {projects.length} project{projects.length !== 1 ? "s" : ""} | {formatVal(totalVal)} total value
              </p>
            </div>
          </div>

          {/* Project Selector */}
          {projects.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Project</label>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.address} ({p.pipelineStage}{p.valuation ? ` - ${formatVal(p.valuation)}` : ""})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Template Selector */}
          {templates.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Template</label>
              <select
                value={selectedTemplate}
                onChange={(e) => applyTemplate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- No template --</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.stage})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject..."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              placeholder="Email body... Use {{name}}, {{projectAddress}}, {{permitNumber}} for variables."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          {/* Result */}
          {result && (
            <p className={`text-sm ${result.includes("error") || result.includes("Failed") ? "text-red-600" : "text-green-600"}`}>
              {result}
            </p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={sending || !subject.trim() || !body.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Send size={14} /> {sending ? "Sending..." : "Send Email"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
