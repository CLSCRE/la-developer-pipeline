"use client";

import { useState, useEffect } from "react";
import { Save, RefreshCw, Copy, Check } from "lucide-react";

interface AutomationSettingsProps {
  settings: Record<string, string>;
  onSave: (settings: Record<string, string>) => Promise<void>;
}

export default function AutomationSettings({ settings, onSave }: AutomationSettingsProps) {
  const [enabled, setEnabled] = useState(settings.cron_enabled === "true");
  const [secret, setSecret] = useState(settings.cron_secret || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setEnabled(settings.cron_enabled === "true");
    setSecret(settings.cron_secret || "");
  }, [settings]);

  const generateSecret = () => {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    const hex = Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
    setSecret(hex);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    await onSave({
      cron_enabled: enabled ? "true" : "false",
      cron_secret: secret,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const curlCommand = `curl "${typeof window !== "undefined" ? window.location.origin : "https://your-domain.com"}/api/cron/scrape?token=${secret}"`;

  const copyCommand = async () => {
    await navigator.clipboard.writeText(curlCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lastRun = settings.cron_last_run;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-1">Automated Pipeline Refresh</h3>
        <p className="text-xs text-slate-400">
          Configure a cron job to automatically run scrapes, assessor enrichment, and lead score recomputation on a schedule.
        </p>
      </div>

      {/* Enable/Disable Toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setEnabled(!enabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            enabled ? "bg-blue-600" : "bg-slate-300"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
        <span className="text-sm text-slate-700 font-medium">
          {enabled ? "Cron enabled" : "Cron disabled"}
        </span>
      </div>

      {/* Secret Token */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Secret Token</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Enter or generate a secret token"
            className="flex-1 max-w-md px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          />
          <button
            onClick={generateSecret}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            <RefreshCw size={14} /> Generate
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-1">This token authenticates cron requests. Keep it secret.</p>
      </div>

      {/* Curl Command */}
      {secret && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Cron Command</label>
          <div className="relative">
            <pre className="bg-slate-900 text-green-400 text-xs p-3 rounded-lg overflow-x-auto font-mono">
              {curlCommand}
            </pre>
            <button
              onClick={copyCommand}
              className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-1 text-xs text-slate-400 bg-slate-800 rounded hover:bg-slate-700"
            >
              {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Add this to your cron scheduler (e.g. cron-job.org, Vercel Cron, or system crontab). Recommended: once daily.
          </p>
        </div>
      )}

      {/* Last Run */}
      {lastRun && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
          <p className="text-sm text-slate-600">
            Last cron run: <span className="font-medium text-slate-900">{new Date(lastRun).toLocaleString()}</span>
          </p>
        </div>
      )}

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Save size={14} /> {saving ? "Saving..." : "Save Automation Settings"}
        </button>
        {saved && <span className="text-sm text-green-600">Saved</span>}
      </div>
    </div>
  );
}
