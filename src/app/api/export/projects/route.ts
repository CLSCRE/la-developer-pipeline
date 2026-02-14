import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const projects = await prisma.project.findMany({
    include: { developer: { select: { name: true } } },
    orderBy: { permitDate: "desc" },
  });

  const headers = [
    "Permit Number", "Permit Type", "Status", "Pipeline Stage", "Financing Type",
    "Address", "Valuation", "Units", "Stories", "Sq Ft", "Zone Code",
    "Owner Name", "Developer", "Permit Date", "Issue Date",
    "APN", "Latitude", "Longitude",
  ];

  const escCsv = (val: string | number | null | undefined) => {
    if (val == null) return "";
    const s = String(val);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const rows = projects.map((p) => [
    p.permitNumber,
    p.permitType,
    p.status,
    p.pipelineStage,
    p.financingType,
    p.address,
    p.valuation,
    p.units,
    p.stories,
    p.sqft,
    p.zoneCode,
    p.ownerName,
    p.developer?.name,
    p.permitDate ? new Date(p.permitDate).toISOString().split("T")[0] : null,
    p.issueDate ? new Date(p.issueDate).toISOString().split("T")[0] : null,
    p.apn,
    p.latitude,
    p.longitude,
  ].map(escCsv).join(","));

  const csv = [headers.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="projects-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
