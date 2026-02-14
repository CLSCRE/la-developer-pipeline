"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { Search, Filter, X } from "lucide-react";

interface MapProject {
  id: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  pipelineStage: string;
  permitType: string;
  valuation: number | null;
}

interface MapViewProps {
  projects: MapProject[];
}

const stageColors: Record<string, string> = {
  entitlement: "#f59e0b",
  permitted: "#3b82f6",
  construction: "#8b5cf6",
  completed: "#22c55e",
};

const permitTypeOptions = ["Bldg-New", "Bldg-Alter/Repair"];
const valuationRanges = [
  { label: "All", min: 0, max: Infinity },
  { label: "$500K - $1M", min: 500000, max: 1000000 },
  { label: "$1M - $5M", min: 1000000, max: 5000000 },
  { label: "$5M - $20M", min: 5000000, max: 20000000 },
  { label: "$20M+", min: 20000000, max: Infinity },
];

// Component to fly/pan map to a position — uses useMap hook inside MapContainer
function FlyToPosition({ position, zoom }: { position: [number, number] | null; zoom: number }) {
  const [ReactLeaflet, setRL] = useState<typeof import("react-leaflet") | null>(null);

  useEffect(() => {
    import("react-leaflet").then(setRL);
  }, []);

  const MapComponent = useCallback(() => {
    if (!ReactLeaflet || !position) return null;
    const { useMap } = ReactLeaflet;
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const map = useMap();
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      if (position) {
        map.flyTo(position, zoom, { duration: 1.5 });
      }
    }, [map, position, zoom]);
    return null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ReactLeaflet, position, zoom]);

  if (!ReactLeaflet || !position) return null;
  return <MapComponent />;
}

function MapInner({ projects }: MapViewProps) {
  const [L, setL] = useState<typeof import("leaflet") | null>(null);
  const [ReactLeaflet, setReactLeaflet] = useState<typeof import("react-leaflet") | null>(null);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [stageFilter, setStageFilter] = useState<string[]>([]);
  const [permitTypeFilter, setPermitTypeFilter] = useState("");
  const [valuationRange, setValuationRange] = useState(0);

  // Address search
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const [flyZoom, setFlyZoom] = useState(15);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([import("leaflet"), import("react-leaflet")]).then(([leaflet, rl]) => {
      setL(leaflet);
      setReactLeaflet(rl);
    });
  }, []);

  useEffect(() => {
    if (L) {
      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });
    }
  }, [L]);

  // Filter projects
  const filteredProjects = projects.filter((p) => {
    if (!p.latitude || !p.longitude) return false;
    if (stageFilter.length > 0 && !stageFilter.includes(p.pipelineStage)) return false;
    if (permitTypeFilter && p.permitType !== permitTypeFilter) return false;
    const range = valuationRanges[valuationRange];
    if (range && p.valuation !== null) {
      if (p.valuation < range.min || p.valuation >= range.max) return false;
    }
    return true;
  });

  // Address search using OpenStreetMap Nominatim
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const query = searchQuery.includes("Los Angeles") ? searchQuery : `${searchQuery}, Los Angeles, CA`;
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=us`,
        { headers: { "User-Agent": "LADevPipeline/1.0" } }
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        setFlyTarget([lat, lon]);
        setFlyZoom(16);
      }
    } catch {
      // Geocoding failed silently
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  const toggleStage = (stage: string) => {
    setStageFilter((prev) =>
      prev.includes(stage) ? prev.filter((s) => s !== stage) : [...prev, stage]
    );
  };

  if (!L || !ReactLeaflet) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm h-[600px] flex items-center justify-center">
        <p className="text-slate-400">Loading map...</p>
      </div>
    );
  }

  const { MapContainer, TileLayer, CircleMarker, Popup, Marker } = ReactLeaflet;

  const center: [number, number] = filteredProjects.length > 0
    ? [
        filteredProjects.reduce((s, p) => s + p.latitude!, 0) / filteredProjects.length,
        filteredProjects.reduce((s, p) => s + p.longitude!, 0) / filteredProjects.length,
      ]
    : [34.0522, -118.2437];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"
      />

      {/* Search + Filter Bar */}
      <div className="px-4 py-3 bg-white border-b border-slate-200 flex flex-wrap items-center gap-3">
        {/* Address Search */}
        <div className="flex items-center gap-2 flex-1 min-w-[250px]">
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search address to zoom..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={searching || !searchQuery.trim()}
            className="px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {searching ? "..." : "Go"}
          </button>
        </div>

        {/* Filter Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
            showFilters || stageFilter.length > 0 || permitTypeFilter || valuationRange > 0
              ? "bg-blue-50 text-blue-700 border-blue-200"
              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          }`}
        >
          <Filter size={14} />
          Filters
          {(stageFilter.length > 0 || permitTypeFilter || valuationRange > 0) && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-600 text-white rounded-full">
              {stageFilter.length + (permitTypeFilter ? 1 : 0) + (valuationRange > 0 ? 1 : 0)}
            </span>
          )}
        </button>

        {/* Clear Filters */}
        {(stageFilter.length > 0 || permitTypeFilter || valuationRange > 0) && (
          <button
            onClick={() => { setStageFilter([]); setPermitTypeFilter(""); setValuationRange(0); }}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-slate-500 hover:text-red-600"
          >
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-4">
          {/* Stage Filter */}
          <div>
            <span className="text-xs font-medium text-slate-500 block mb-1">Pipeline Stage</span>
            <div className="flex gap-1.5">
              {Object.entries(stageColors).map(([stage, color]) => (
                <button
                  key={stage}
                  onClick={() => toggleStage(stage)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full border transition-colors ${
                    stageFilter.includes(stage)
                      ? "border-transparent text-white"
                      : "border-slate-200 text-slate-600 bg-white hover:bg-slate-100"
                  }`}
                  style={stageFilter.includes(stage) ? { backgroundColor: color } : {}}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: stageFilter.includes(stage) ? "#fff" : color }}
                  />
                  {stage.charAt(0).toUpperCase() + stage.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Permit Type */}
          <div>
            <span className="text-xs font-medium text-slate-500 block mb-1">Permit Type</span>
            <select
              value={permitTypeFilter}
              onChange={(e) => setPermitTypeFilter(e.target.value)}
              className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              {permitTypeOptions.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Valuation Range */}
          <div>
            <span className="text-xs font-medium text-slate-500 block mb-1">Valuation</span>
            <select
              value={valuationRange}
              onChange={(e) => setValuationRange(parseInt(e.target.value))}
              className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {valuationRanges.map((r, i) => (
                <option key={i} value={i}>{r.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Map */}
      <MapContainer
        center={center}
        zoom={11}
        style={{ height: "600px", width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FlyToPosition position={flyTarget} zoom={flyZoom} />
        {flyTarget && (
          <Marker position={flyTarget} />
        )}
        {filteredProjects.map((project) => (
          <CircleMarker
            key={project.id}
            center={[project.latitude!, project.longitude!]}
            radius={6}
            pathOptions={{
              fillColor: stageColors[project.pipelineStage] || "#64748b",
              color: "#fff",
              weight: 2,
              fillOpacity: 0.8,
            }}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">{project.address}</p>
                <p className="text-slate-500">{project.permitType}</p>
                <p className="text-slate-500 capitalize">{project.pipelineStage}</p>
                {project.valuation && (
                  <p className="text-slate-500 font-medium">
                    ${project.valuation.toLocaleString()}
                  </p>
                )}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      {/* Legend Bar */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center gap-4">
        {Object.entries(stageColors).map(([stage, color]) => (
          <div key={stage} className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            {stage.charAt(0).toUpperCase() + stage.slice(1)}
          </div>
        ))}
        <span className="text-xs text-slate-400 ml-auto">
          {filteredProjects.length} of {projects.filter(p => p.latitude && p.longitude).length} shown
        </span>
      </div>
    </div>
  );
}

// Dynamic import to avoid SSR issues with Leaflet
export const MapView = dynamic(() => Promise.resolve(MapInner), {
  ssr: false,
  loading: () => (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm h-[600px] flex items-center justify-center">
      <p className="text-slate-400">Loading map...</p>
    </div>
  ),
});
