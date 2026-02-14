"use client";

import { useState, useEffect } from "react";
import { Save } from "lucide-react";

interface ScrapeSettingsProps {
  settings: Record<string, string>;
  onSave: (settings: Record<string, string>) => Promise<void>;
}

export default function ScrapeSettings({ settings, onSave }: ScrapeSettingsProps) {
  const [minValuation, setMinValuation] = useState(settings.scrape_min_valuation || "500000");
  const [permitTypes, setPermitTypes] = useState(settings.scrape_permit_types || "Bldg-New,Bldg-Alter/Repair");
  const [pageSize, setPageSize] = useState(settings.scrape_page_size || "1000");
  const [googlePlacesKey, setGooglePlacesKey] = useState(settings.google_places_api_key || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setMinValuation(settings.scrape_min_valuation || "500000");
    setPermitTypes(settings.scrape_permit_types || "Bldg-New,Bldg-Alter/Repair");
    setPageSize(settings.scrape_page_size || "1000");
    setGooglePlacesKey(settings.google_places_api_key || "");
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    await onSave({
      scrape_min_valuation: minValuation,
      scrape_permit_types: permitTypes,
      scrape_page_size: pageSize,
      google_places_api_key: googlePlacesKey,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Minimum Valuation ($)</label>
        <input
          type="number"
          value={minValuation}
          onChange={(e) => setMinValuation(e.target.value)}
          className="w-full max-w-xs px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-slate-400 mt-1">Only scrape permits above this valuation</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Permit Types</label>
        <input
          type="text"
          value={permitTypes}
          onChange={(e) => setPermitTypes(e.target.value)}
          className="w-full max-w-md px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-slate-400 mt-1">Comma-separated list of permit types to track</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Page Size</label>
        <input
          type="number"
          value={pageSize}
          onChange={(e) => setPageSize(e.target.value)}
          className="w-full max-w-xs px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-slate-400 mt-1">Records per API page (max 1000)</p>
      </div>
      <hr className="border-slate-200" />
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Google Places API Key</label>
        <input
          type="password"
          value={googlePlacesKey}
          onChange={(e) => setGooglePlacesKey(e.target.value)}
          placeholder="AIza..."
          className="w-full max-w-md px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
        />
        <p className="text-xs text-slate-400 mt-1">Required for Google Places contact enrichment (phone, website, address)</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Save size={14} /> {saving ? "Saving..." : "Save Scrape Settings"}
        </button>
        {saved && <span className="text-sm text-green-600">Saved</span>}
      </div>
    </div>
  );
}
