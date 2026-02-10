"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, Building2, MapPin, User, FileText, Search, RefreshCw, ExternalLink } from "lucide-react";

const stageColors: Record<string, string> = {
  entitlement: "bg-amber-100 text-amber-800",
  permitted: "bg-blue-100 text-blue-800",
  construction: "bg-violet-100 text-violet-800",
  completed: "bg-green-100 text-green-800",
};

const financingLabels: Record<string, string> = {
  predevelopment: "Predevelopment Loan",
  construction: "Construction Loan",
  bridge: "Bridge Loan",
  permanent: "Permanent Financing",
};

export default function ProjectDetailPage() {
  const params = useParams();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [enriching, setEnriching] = useState(false);
  const [enrichResult, setEnrichResult] = useState<string | null>(null);

  const fetchProject = () => {
    fetch(`/api/projects/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        setProject(data);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchProject();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const enrichFromAssessor = async () => {
    setEnriching(true);
    setEnrichResult(null);
    try {
      const res = await fetch("/api/enrich/assessor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id }),
      });
      const data = await res.json();
      if (data.success) {
        setEnrichResult("Enriched successfully");
        fetchProject();
      } else {
        setEnrichResult(data.error || "Failed to enrich");
      }
    } catch {
      setEnrichResult("Network error");
    } finally {
      setEnriching(false);
    }
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

  if (!project || project.error) {
    return (
      <div className="p-6">
        <Link href="/projects" className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1 mb-4">
          <ArrowLeft size={14} /> Back to Projects
        </Link>
        <p className="text-slate-500">Project not found.</p>
      </div>
    );
  }

  const apnFormatted = project.apn
    ? `${project.apn.slice(0, 4)}-${project.apn.slice(4, 7)}-${project.apn.slice(7)}`
    : null;

  return (
    <div className="p-6 space-y-6">
      <Link href="/projects" className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1">
        <ArrowLeft size={14} /> Back to Projects
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{project.address}</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-sm text-slate-500">Permit #{project.permitNumber}</p>
            {apnFormatted && (
              <p className="text-sm text-slate-500">APN: {apnFormatted}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${stageColors[project.pipelineStage] || "bg-slate-100 text-slate-600"}`}>
            {project.pipelineStage.charAt(0).toUpperCase() + project.pipelineStage.slice(1)}
          </span>
          <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-sm font-medium">
            {financingLabels[project.financingType] || project.financingType}
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        {project.apn && !project.assessorEnrichedAt && (
          <button
            onClick={enrichFromAssessor}
            disabled={enriching}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={14} className={enriching ? "animate-spin" : ""} />
            {enriching ? "Enriching..." : "Enrich from Assessor"}
          </button>
        )}
        {project.assessorEnrichedAt && (
          <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
            Assessor data loaded {format(new Date(project.assessorEnrichedAt), "MMM d, yyyy")}
          </span>
        )}
        {project.apn && (
          <a
            href={`https://portal.assessor.lacounty.gov/parceldetail/${project.apn}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <Search size={14} />
            Look Up Owner on Assessor Portal
            <ExternalLink size={12} />
          </a>
        )}
        {enrichResult && (
          <span className={`text-sm ${enrichResult.includes("success") ? "text-green-600" : "text-red-600"}`}>
            {enrichResult}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Permit Details */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-4">
            <FileText size={16} /> Permit Details
          </h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Type</dt>
              <dd className="text-slate-900 font-medium">{project.permitType}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Status</dt>
              <dd className="text-slate-900 font-medium">{project.status}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Source</dt>
              <dd className="text-slate-900 font-medium uppercase">{project.source}</dd>
            </div>
            {project.contractor && (
              <div className="flex justify-between">
                <dt className="text-slate-500">Contractor</dt>
                <dd className="text-slate-900 font-medium">{project.contractor}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Property Info */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-4">
            <Building2 size={16} /> Property Info
          </h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Permit Valuation</dt>
              <dd className="text-slate-900 font-medium">
                {project.valuation ? `$${project.valuation.toLocaleString()}` : "—"}
              </dd>
            </div>
            {project.zoneCode && (
              <div className="flex justify-between">
                <dt className="text-slate-500">Zone</dt>
                <dd className="text-slate-900 font-medium">{project.zoneCode}</dd>
              </div>
            )}
            {project.assessorUseType && (
              <div className="flex justify-between">
                <dt className="text-slate-500">Use Type</dt>
                <dd className="text-slate-900 font-medium">{project.assessorUseType}</dd>
              </div>
            )}
            {project.assessorYearBuilt && (
              <div className="flex justify-between">
                <dt className="text-slate-500">Year Built</dt>
                <dd className="text-slate-900 font-medium">{project.assessorYearBuilt}</dd>
              </div>
            )}
            {project.assessorSqftMain && (
              <div className="flex justify-between">
                <dt className="text-slate-500">Building Sq Ft</dt>
                <dd className="text-slate-900 font-medium">{project.assessorSqftMain.toLocaleString()}</dd>
              </div>
            )}
            {project.assessorSqftLot && (
              <div className="flex justify-between">
                <dt className="text-slate-500">Lot Sq Ft</dt>
                <dd className="text-slate-900 font-medium">{project.assessorSqftLot.toLocaleString()}</dd>
              </div>
            )}
            {project.assessorBedrooms && (
              <div className="flex justify-between">
                <dt className="text-slate-500">Beds / Baths</dt>
                <dd className="text-slate-900 font-medium">{project.assessorBedrooms} / {project.assessorBathrooms || "—"}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Assessed Values & Dates */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-4">
            <User size={16} /> Assessed Values & Dates
          </h3>
          <dl className="space-y-3 text-sm">
            {project.assessorLandValue != null && (
              <div className="flex justify-between">
                <dt className="text-slate-500">Assessed Land</dt>
                <dd className="text-slate-900 font-medium">${project.assessorLandValue.toLocaleString()}</dd>
              </div>
            )}
            {project.assessorImpValue != null && (
              <div className="flex justify-between">
                <dt className="text-slate-500">Assessed Improvements</dt>
                <dd className="text-slate-900 font-medium">${project.assessorImpValue.toLocaleString()}</dd>
              </div>
            )}
            {project.assessorExemption && (
              <div className="flex justify-between">
                <dt className="text-slate-500">Exemption</dt>
                <dd className="text-slate-900 font-medium">{project.assessorExemption}</dd>
              </div>
            )}
            {project.permitDate && (
              <div className="flex justify-between">
                <dt className="text-slate-500">Permit Date</dt>
                <dd className="text-slate-900 font-medium">{format(new Date(project.permitDate), "MMM d, yyyy")}</dd>
              </div>
            )}
            {project.issueDate && (
              <div className="flex justify-between">
                <dt className="text-slate-500">Issue Date</dt>
                <dd className="text-slate-900 font-medium">{format(new Date(project.issueDate), "MMM d, yyyy")}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Legal Description */}
      {project.assessorLegalDesc && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Legal Description</h3>
          <p className="text-sm text-slate-600 font-mono">{project.assessorLegalDesc}</p>
        </div>
      )}

      {/* Work Description */}
      {project.description && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Work Description</h3>
          <p className="text-sm text-slate-600 whitespace-pre-wrap">{project.description}</p>
        </div>
      )}

      {/* Location */}
      {project.latitude && project.longitude && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-3">
            <MapPin size={16} /> Location
          </h3>
          <p className="text-sm text-slate-500">
            {project.latitude.toFixed(6)}, {project.longitude.toFixed(6)}
          </p>
        </div>
      )}
    </div>
  );
}
