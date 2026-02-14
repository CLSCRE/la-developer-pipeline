"use client";

import { useState, useEffect } from "react";
import { Save, Zap } from "lucide-react";

interface EmailSettingsProps {
  settings: Record<string, string>;
  onSave: (settings: Record<string, string>) => Promise<void>;
}

export default function EmailSettings({ settings, onSave }: EmailSettingsProps) {
  const [host, setHost] = useState("");
  const [port, setPort] = useState("587");
  const [secure, setSecure] = useState(false);
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [from, setFrom] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    setHost(settings.smtp_host || "");
    setPort(settings.smtp_port || "587");
    setSecure(settings.smtp_secure === "true");
    setUser(settings.smtp_user || "");
    setPass(settings.smtp_pass || "");
    setFrom(settings.smtp_from || "");
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    await onSave({
      smtp_host: host,
      smtp_port: port,
      smtp_secure: String(secure),
      smtp_user: user,
      smtp_pass: pass,
      smtp_from: from,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/settings/test-smtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host, port: parseInt(port), secure, user, pass }),
      });
      const data = await res.json();
      setTestResult(data.message);
    } catch {
      setTestResult("Network error");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">SMTP Host</label>
          <input type="text" value={host} onChange={(e) => setHost(e.target.value)} placeholder="smtp.gmail.com" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Port</label>
          <input type="number" value={port} onChange={(e) => setPort(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
          <input type="text" value={user} onChange={(e) => setUser(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
          <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">From Address</label>
          <input type="email" value={from} onChange={(e) => setFrom(e.target.value)} placeholder="you@company.com" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 pb-2">
            <input type="checkbox" checked={secure} onChange={(e) => setSecure(e.target.checked)} className="rounded border-slate-300" />
            <span className="text-sm text-slate-700">Use TLS/SSL</span>
          </label>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Save size={14} /> {saving ? "Saving..." : "Save Email Settings"}
        </button>
        <button
          onClick={handleTest}
          disabled={testing || !host || !user || !pass}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 disabled:opacity-50"
        >
          <Zap size={14} /> {testing ? "Testing..." : "Test Connection"}
        </button>
        {saved && <span className="text-sm text-green-600">Saved</span>}
        {testResult && (
          <span className={`text-sm ${testResult.includes("successful") ? "text-green-600" : "text-red-600"}`}>
            {testResult}
          </span>
        )}
      </div>
    </div>
  );
}
