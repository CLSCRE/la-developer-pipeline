"use client";

import { useState, useEffect } from "react";
import { X, Send } from "lucide-react";

interface ComposeEmailProps {
  open: boolean;
  onClose: () => void;
  developerId: string;
  developerName: string;
  projectId?: string;
  projectAddress?: string;
  onSent: () => void;
}

interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
  stage: string;
}

export default function ComposeEmail({
  open,
  onClose,
  developerId,
  developerName,
  projectId,
  projectAddress,
  onSent,
}: ComposeEmailProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetch("/api/templates")
        .then((r) => r.json())
        .then((data) => setTemplates(Array.isArray(data) ? data : []));
    }
  }, [open]);

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
          projectId,
          subject,
          body,
          templateId: selectedTemplate || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data.status === "sent" ? "Email sent successfully" : "Email logged (no SMTP configured)");
        onSent();
        setTimeout(() => {
          onClose();
          setSubject("");
          setBody("");
          setResult(null);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Compose Email</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">To</label>
            <p className="text-sm text-slate-600 bg-slate-50 px-3 py-2 rounded-lg">{developerName}</p>
          </div>
          {projectAddress && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Regarding</label>
              <p className="text-sm text-slate-600 bg-slate-50 px-3 py-2 rounded-lg">{projectAddress}</p>
            </div>
          )}
          {templates.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Template</label>
              <select
                value={selectedTemplate}
                onChange={(e) => applyTemplate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— No template —</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({t.stage})</option>
                ))}
              </select>
            </div>
          )}
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
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              placeholder="Email body... Use {{name}}, {{company}}, {{projectAddress}} for variables"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>
          <p className="text-xs text-slate-400">
            Variables: {"{{name}}"}, {"{{company}}"}, {"{{email}}"}, {"{{projectAddress}}"}, {"{{permitNumber}}"}
          </p>
          {result && (
            <p className={`text-sm ${result.includes("success") || result.includes("logged") ? "text-green-600" : "text-red-600"}`}>
              {result}
            </p>
          )}
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
