"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Edit3, Save, X } from "lucide-react";

interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
  stage: string;
  isDefault: boolean;
}

export default function TemplateManager() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", subject: "", body: "", stage: "entitlement", isDefault: false });
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchTemplates = () => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then((data) => setTemplates(Array.isArray(data) ? data : []));
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const startEdit = (t: Template) => {
    setEditing(t.id);
    setForm({ name: t.name, subject: t.subject, body: t.body, stage: t.stage, isDefault: t.isDefault });
    setCreating(false);
  };

  const startCreate = () => {
    setCreating(true);
    setEditing(null);
    setForm({ name: "", subject: "", body: "", stage: "entitlement", isDefault: false });
  };

  const handleSave = async () => {
    if (!form.name || !form.subject || !form.body) return;
    setSaving(true);
    try {
      if (creating) {
        await fetch("/api/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      } else if (editing) {
        await fetch(`/api/templates/${editing}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      }
      setEditing(null);
      setCreating(false);
      fetchTemplates();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    await fetch(`/api/templates/${id}`, { method: "DELETE" });
    fetchTemplates();
  };

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">{templates.length} template{templates.length !== 1 ? "s" : ""}</p>
        <button
          onClick={startCreate}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={14} /> New Template
        </button>
      </div>

      {(creating || editing) && (
        <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
              <input type="text" value={form.name} onChange={set("name")} placeholder="Template name" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Stage</label>
              <select value={form.stage} onChange={set("stage")} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="entitlement">Entitlement</option>
                <option value="permitted">Permitted</option>
                <option value="construction">Construction</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
            <input type="text" value={form.subject} onChange={set("subject")} placeholder="Email subject" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Body</label>
            <textarea value={form.body} onChange={set("body")} rows={6} placeholder="Email body... Use {{name}}, {{company}}, {{projectAddress}}" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
          </div>
          <p className="text-xs text-slate-400">
            Variables: {"{{name}}"}, {"{{company}}"}, {"{{email}}"}, {"{{projectAddress}}"}, {"{{permitNumber}}"}
          </p>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              <Save size={14} /> {saving ? "Saving..." : creating ? "Create" : "Update"}
            </button>
            <button onClick={() => { setCreating(false); setEditing(null); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100">
              <X size={14} /> Cancel
            </button>
          </div>
        </div>
      )}

      <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 overflow-hidden">
        {templates.map((t) => (
          <div key={t.id} className="px-4 py-3 flex items-center justify-between bg-white hover:bg-slate-50">
            <div>
              <p className="text-sm font-medium text-slate-900">{t.name}</p>
              <p className="text-xs text-slate-500">{t.subject}</p>
              <span className="inline-flex mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">{t.stage}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => startEdit(t)} className="p-1.5 text-slate-400 hover:text-blue-600">
                <Edit3 size={14} />
              </button>
              <button onClick={() => handleDelete(t.id)} className="p-1.5 text-slate-400 hover:text-red-600">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {templates.length === 0 && (
          <div className="px-4 py-8 text-center text-slate-400 text-sm bg-white">No templates yet</div>
        )}
      </div>
    </div>
  );
}
