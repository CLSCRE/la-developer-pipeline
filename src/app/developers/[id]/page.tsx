"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowLeft, User, Building2, Mail, Phone, Globe, Linkedin,
  MapPin, Tag, Edit3, Save, X, Trash2, Send, ClipboardList, Target,
} from "lucide-react";
import OutreachTimeline from "@/components/OutreachTimeline";
import ComposeEmail from "@/components/ComposeEmail";
import LogOutreach from "@/components/LogOutreach";
import { LeadScoreBadge } from "@/components/LeadScoreBadge";
import { EnrichContactsButton } from "@/components/EnrichContactsButton";

const stageColors: Record<string, string> = {
  new: "bg-slate-100 text-slate-700",
  contacted: "bg-blue-100 text-blue-800",
  in_discussion: "bg-amber-100 text-amber-800",
  proposal_sent: "bg-violet-100 text-violet-800",
  won: "bg-green-100 text-green-800",
  lost: "bg-red-100 text-red-800",
  dormant: "bg-slate-100 text-slate-500",
};

const stageLabels: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  in_discussion: "In Discussion",
  proposal_sent: "Proposal Sent",
  won: "Won",
  lost: "Lost",
  dormant: "Dormant",
};

const projectStageColors: Record<string, string> = {
  entitlement: "bg-amber-100 text-amber-800",
  permitted: "bg-blue-100 text-blue-800",
  construction: "bg-violet-100 text-violet-800",
  completed: "bg-green-100 text-green-800",
};

interface LeadScoreData {
  opportunity: number;
  timing: number;
  quality: number;
  reachability: number;
  total: number;
  reasoning: string;
}

export default function DeveloperDetailPage() {
  const params = useParams();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [developer, setDeveloper] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);

  const fetchDeveloper = useCallback(() => {
    fetch(`/api/developers/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        setDeveloper(data);
        setLoading(false);
      });
  }, [params.id]);

  useEffect(() => {
    fetchDeveloper();
  }, [fetchDeveloper]);

  const startEdit = () => {
    setForm({
      name: developer.name || "",
      company: developer.company || "",
      email: developer.email || "",
      phone: developer.phone || "",
      linkedinUrl: developer.linkedinUrl || "",
      website: developer.website || "",
      address: developer.address || "",
      entityType: developer.entityType || "",
      notes: developer.notes || "",
      pipelineStage: developer.pipelineStage || "new",
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      await fetch(`/api/developers/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setEditing(false);
      fetchDeveloper();
    } finally {
      setSaving(false);
    }
  };

  const deleteDeveloper = async () => {
    if (!confirm("Delete this developer? This will unlink all projects and remove all outreach logs.")) return;
    await fetch(`/api/developers/${params.id}`, { method: "DELETE" });
    window.location.href = "/developers";
  };

  const addTag = async () => {
    if (!newTag.trim()) return;
    await fetch(`/api/developers/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setNewTag("");
    fetchDeveloper();
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/3" />
          <div className="h-4 bg-slate-200 rounded w-1/2" />
          <div className="h-64 bg-slate-200 rounded" />
        </div>
      </div>
    );
  }

  if (!developer || developer.error) {
    return (
      <div className="p-6">
        <Link href="/developers" className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1 mb-4">
          <ArrowLeft size={14} /> Back to Developers
        </Link>
        <p className="text-slate-500">Developer not found.</p>
      </div>
    );
  }

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f: Record<string, string>) => ({ ...f, [field]: e.target.value }));

  const scoreData: LeadScoreData | null = developer.leadScoreData
    ? JSON.parse(developer.leadScoreData)
    : null;

  return (
    <div className="p-6 space-y-6">
      <Link href="/developers" className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1">
        <ArrowLeft size={14} /> Back to Developers
      </Link>

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <LeadScoreBadge score={developer.leadScore} size="lg" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{developer.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              {developer.company && <p className="text-sm text-slate-500">{developer.company}</p>}
              {developer.entityType && <p className="text-sm text-slate-400">{developer.entityType}</p>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${stageColors[developer.pipelineStage] || "bg-slate-100 text-slate-600"}`}>
            {stageLabels[developer.pipelineStage] || developer.pipelineStage}
          </span>
          {!editing && (
            <>
              <EnrichContactsButton developerId={developer.id} onComplete={fetchDeveloper} />
              <button onClick={startEdit} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
                <Edit3 size={14} /> Edit
              </button>
              <button onClick={deleteDeveloper} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50">
                <Trash2 size={14} /> Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* Lead Score Breakdown */}
      {scoreData && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-3">
            <Target size={16} /> Lead Score Breakdown
          </h3>
          <p className="text-sm text-slate-600 italic mb-4">{scoreData.reasoning}</p>
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Opportunity", score: scoreData.opportunity, max: 40, color: "bg-green-500" },
              { label: "Timing", score: scoreData.timing, max: 30, color: "bg-blue-500" },
              { label: "Quality", score: scoreData.quality, max: 20, color: "bg-violet-500" },
              { label: "Reachability", score: scoreData.reachability, max: 10, color: "bg-amber-500" },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span>{item.label}</span>
                  <span className="font-medium text-slate-700">{item.score}/{item.max}</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full">
                  <div
                    className={`h-2 rounded-full ${item.color}`}
                    style={{ width: `${(item.score / item.max) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          {developer.leadScoreAt && (
            <p className="text-xs text-slate-400 mt-3">
              Last computed: {format(new Date(developer.leadScoreAt), "MMM d, yyyy h:mm a")}
            </p>
          )}
        </div>
      )}

      {editing ? (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-slate-700">Edit Developer</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
              <input type="text" value={form.name} onChange={set("name")} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Company</label>
              <input type="text" value={form.company} onChange={set("company")} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Stage</label>
              <select value={form.pipelineStage} onChange={set("pipelineStage")} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                {Object.entries(stageLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={set("email")} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <input type="tel" value={form.phone} onChange={set("phone")} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">LinkedIn</label>
              <input type="url" value={form.linkedinUrl} onChange={set("linkedinUrl")} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Website</label>
              <input type="url" value={form.website} onChange={set("website")} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
              <input type="text" value={form.address} onChange={set("address")} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <textarea value={form.notes} onChange={set("notes")} rows={3} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setEditing(false)} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
              <X size={14} /> Cancel
            </button>
            <button onClick={saveEdit} disabled={saving} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              <Save size={14} /> {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-4">
              <User size={16} /> Contact Info
            </h3>
            <dl className="space-y-3 text-sm">
              {developer.email && (
                <div className="flex items-center gap-2">
                  <Mail size={14} className="text-slate-400" />
                  <a href={`mailto:${developer.email}`} className="text-blue-600 hover:text-blue-800">{developer.email}</a>
                </div>
              )}
              {developer.phone && (
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-slate-400" />
                  <span className="text-slate-900">{developer.phone}</span>
                </div>
              )}
              {developer.linkedinUrl && (
                <div className="flex items-center gap-2">
                  <Linkedin size={14} className="text-slate-400" />
                  <a href={developer.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 truncate">LinkedIn</a>
                </div>
              )}
              {developer.website && (
                <div className="flex items-center gap-2">
                  <Globe size={14} className="text-slate-400" />
                  <a href={developer.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 truncate">{developer.website}</a>
                </div>
              )}
              {developer.address && (
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-slate-400" />
                  <span className="text-slate-600">{developer.address}</span>
                </div>
              )}
              {!developer.email && !developer.phone && !developer.linkedinUrl && !developer.website && !developer.address && (
                <p className="text-slate-400 italic">No contact info yet</p>
              )}
            </dl>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-4">
              <Building2 size={16} /> Entity Details
            </h3>
            <dl className="space-y-3 text-sm">
              {developer.entityType && (
                <div className="flex justify-between">
                  <dt className="text-slate-500">Entity Type</dt>
                  <dd className="text-slate-900 font-medium">{developer.entityType}</dd>
                </div>
              )}
              {developer.sosStatus && (
                <div className="flex justify-between">
                  <dt className="text-slate-500">SOS Status</dt>
                  <dd className="text-slate-900 font-medium">{developer.sosStatus}</dd>
                </div>
              )}
              {developer.sosEntityNumber && (
                <div className="flex justify-between">
                  <dt className="text-slate-500">Entity #</dt>
                  <dd className="text-slate-900 font-medium">{developer.sosEntityNumber}</dd>
                </div>
              )}
              {developer.sosRegistrationDate && (
                <div className="flex justify-between">
                  <dt className="text-slate-500">Registered</dt>
                  <dd className="text-slate-900 font-medium">{developer.sosRegistrationDate}</dd>
                </div>
              )}
              {developer.sosAgentName && (
                <div className="flex justify-between">
                  <dt className="text-slate-500">Agent</dt>
                  <dd className="text-slate-900 font-medium text-right max-w-[60%] truncate" title={developer.sosAgentName}>{developer.sosAgentName}</dd>
                </div>
              )}
              {developer.sosAgentAddress && (
                <div className="flex justify-between">
                  <dt className="text-slate-500">Agent Addr</dt>
                  <dd className="text-slate-900 text-xs text-right max-w-[60%] truncate" title={developer.sosAgentAddress}>{developer.sosAgentAddress}</dd>
                </div>
              )}
              {developer.googlePlacesUrl && (
                <div className="flex justify-between">
                  <dt className="text-slate-500">Google Places</dt>
                  <dd>
                    <a href={developer.googlePlacesUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-sm">View on Maps</a>
                  </dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-slate-500">Added</dt>
                <dd className="text-slate-900 font-medium">{format(new Date(developer.createdAt), "MMM d, yyyy")}</dd>
              </div>
            </dl>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-4">
              <Tag size={16} /> Tags
            </h3>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {developer.tags?.map((t: { id: string; tag: string }) => (
                <span key={t.id} className="inline-flex px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">
                  {t.tag}
                </span>
              ))}
              {(!developer.tags || developer.tags.length === 0) && (
                <p className="text-xs text-slate-400 italic">No tags</p>
              )}
            </div>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add tag..."
                className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                onKeyDown={(e) => e.key === "Enter" && addTag()}
              />
            </div>
          </div>
        </div>
      )}

      {developer.notes && !editing && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Notes</h3>
          <p className="text-sm text-slate-600 whitespace-pre-wrap">{developer.notes}</p>
        </div>
      )}

      {/* Linked Projects */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-700">Linked Projects ({developer.projects?.length || 0})</h3>
        </div>
        {developer.projects && developer.projects.length > 0 ? (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Address</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Permit #</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Type</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Stage</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Substage</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Valuation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {developer.projects.map((p: { id: string; address: string; permitNumber: string; permitType: string; pipelineStage: string; pipelineSubstage: string | null; valuation: number | null }) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <Link href={`/projects/${p.id}`} className="text-blue-600 hover:text-blue-800 text-sm font-medium">{p.address}</Link>
                  </td>
                  <td className="px-4 py-2 text-sm text-slate-600">{p.permitNumber}</td>
                  <td className="px-4 py-2 text-sm text-slate-600">{p.permitType}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${projectStageColors[p.pipelineStage] || "bg-slate-100 text-slate-600"}`}>
                      {p.pipelineStage}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-500">
                    {p.pipelineSubstage || "—"}
                  </td>
                  <td className="px-4 py-2 text-sm text-slate-600">
                    {p.valuation ? `$${p.valuation.toLocaleString()}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="px-5 py-8 text-center text-slate-400 text-sm">No linked projects</div>
        )}
      </div>

      {/* Outreach History */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Outreach History ({developer.outreachLogs?.length || 0})</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setComposeOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Send size={12} /> Compose Email
            </button>
            <button
              onClick={() => setLogOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              <ClipboardList size={12} /> Log Outreach
            </button>
          </div>
        </div>
        <OutreachTimeline entries={developer.outreachLogs || []} />
      </div>

      <ComposeEmail
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        developerId={developer.id}
        developerName={developer.name}
        onSent={fetchDeveloper}
      />
      <LogOutreach
        open={logOpen}
        onClose={() => setLogOpen(false)}
        developerId={developer.id}
        onLogged={fetchDeveloper}
      />
    </div>
  );
}
