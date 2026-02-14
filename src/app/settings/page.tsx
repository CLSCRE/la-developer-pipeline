"use client";

import { useEffect, useState } from "react";
import { Settings, Database, Mail, FileText, HardDrive, Timer } from "lucide-react";
import ScrapeSettings from "@/components/settings/ScrapeSettings";
import EmailSettings from "@/components/settings/EmailSettings";
import TemplateManager from "@/components/settings/TemplateManager";
import DataManagement from "@/components/settings/DataManagement";
import AutomationSettings from "@/components/settings/AutomationSettings";

const TABS = [
  { key: "scrape", label: "Scrape", icon: <Database size={14} /> },
  { key: "email", label: "Email / SMTP", icon: <Mail size={14} /> },
  { key: "templates", label: "Templates", icon: <FileText size={14} /> },
  { key: "automation", label: "Automation", icon: <Timer size={14} /> },
  { key: "data", label: "Data", icon: <HardDrive size={14} /> },
];

export default function SettingsPage() {
  const [tab, setTab] = useState("scrape");
  const [settings, setSettings] = useState<Record<string, string>>({});

  const fetchSettings = async () => {
    const res = await fetch("/api/settings");
    const data = await res.json();
    setSettings(data);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const saveSettings = async (partial: Record<string, string>) => {
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(partial),
    });
    await fetchSettings();
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Settings size={24} /> Settings
        </h1>
        <p className="text-sm text-slate-500 mt-1">Configure scraping, email, templates, and data management</p>
      </div>

      {/* Tab Bar */}
      <div className="flex border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        {tab === "scrape" && <ScrapeSettings settings={settings} onSave={saveSettings} />}
        {tab === "email" && <EmailSettings settings={settings} onSave={saveSettings} />}
        {tab === "templates" && <TemplateManager />}
        {tab === "automation" && <AutomationSettings settings={settings} onSave={saveSettings} />}
        {tab === "data" && <DataManagement />}
      </div>
    </div>
  );
}
