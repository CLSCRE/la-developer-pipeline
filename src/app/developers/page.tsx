export default function DevelopersPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Developers</h1>
        <p className="text-sm text-slate-500 mt-1">Developer profiles and contact info</p>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
        <p className="text-slate-500">Developer profiles will be available in Phase 2.</p>
        <p className="text-sm text-slate-400 mt-2">
          Phase 2 adds LA County Assessor lookups, Secretary of State entity search, and automatic developer-to-project linking.
        </p>
      </div>
    </div>
  );
}
