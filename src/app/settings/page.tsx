export default function SettingsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Configure SMTP, API keys, scrape filters, and schedules</p>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
        <p className="text-slate-500">Settings will be available in Phase 4.</p>
        <p className="text-sm text-slate-400 mt-2">
          Phase 4 adds SMTP configuration, API key management, scrape filter tuning, email rate limits, and auto-schedule settings.
        </p>
      </div>
    </div>
  );
}
