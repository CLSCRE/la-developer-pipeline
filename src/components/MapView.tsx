"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

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

function MapInner({ projects }: MapViewProps) {
  const [L, setL] = useState<typeof import("leaflet") | null>(null);
  const [ReactLeaflet, setReactLeaflet] = useState<typeof import("react-leaflet") | null>(null);

  useEffect(() => {
    Promise.all([import("leaflet"), import("react-leaflet")]).then(([leaflet, rl]) => {
      setL(leaflet);
      setReactLeaflet(rl);
    });
  }, []);

  useEffect(() => {
    if (L) {
      // Fix default marker icons
      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });
    }
  }, [L]);

  if (!L || !ReactLeaflet) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm h-[500px] flex items-center justify-center">
        <p className="text-slate-400">Loading map...</p>
      </div>
    );
  }

  const { MapContainer, TileLayer, CircleMarker, Popup } = ReactLeaflet;

  const mappableProjects = projects.filter((p) => p.latitude && p.longitude);
  const center: [number, number] = mappableProjects.length > 0
    ? [
        mappableProjects.reduce((s, p) => s + p.latitude!, 0) / mappableProjects.length,
        mappableProjects.reduce((s, p) => s + p.longitude!, 0) / mappableProjects.length,
      ]
    : [34.0522, -118.2437]; // Default to LA center

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"
      />
      <MapContainer
        center={center}
        zoom={11}
        style={{ height: "500px", width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {mappableProjects.map((project) => (
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
                {project.valuation && (
                  <p className="text-slate-500">
                    ${project.valuation.toLocaleString()}
                  </p>
                )}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center gap-4">
        {Object.entries(stageColors).map(([stage, color]) => (
          <div key={stage} className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            {stage.charAt(0).toUpperCase() + stage.slice(1)}
          </div>
        ))}
        <span className="text-xs text-slate-400 ml-auto">{mappableProjects.length} mapped</span>
      </div>
    </div>
  );
}

// Dynamic import to avoid SSR issues with Leaflet
export const MapView = dynamic(() => Promise.resolve(MapInner), {
  ssr: false,
  loading: () => (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm h-[500px] flex items-center justify-center">
      <p className="text-slate-400">Loading map...</p>
    </div>
  ),
});
