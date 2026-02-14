import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/db";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const search = searchParams.get("search") || "";
  const permitType = searchParams.get("permitType") || "";
  const pipelineStage = searchParams.get("pipelineStage") || "";
  const zoneCode = searchParams.get("zoneCode") || "";
  const minValuation = searchParams.get("minValuation") || "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (search) {
    where.OR = [
      { address: { contains: search } },
      { permitNumber: { contains: search } },
      { ownerName: { contains: search } },
      { description: { contains: search } },
    ];
  }

  if (permitType) where.permitType = permitType;
  if (pipelineStage) where.pipelineStage = pipelineStage;
  if (zoneCode) where.zoneCode = zoneCode;
  if (minValuation) where.valuation = { gte: parseFloat(minValuation) };

  const limitParam = searchParams.get("limit") || "500";
  const limit = Math.min(parseInt(limitParam) || 500, 50000);

  const projects = await prisma.project.findMany({
    where,
    orderBy: { permitDate: "desc" },
    take: limit,
  });

  // Also get summary stats
  const allProjects = await prisma.project.findMany({
    select: { pipelineStage: true, valuation: true },
  });

  const stats = {
    total: allProjects.length,
    entitlement: allProjects.filter((p) => p.pipelineStage === "entitlement").length,
    permitted: allProjects.filter((p) => p.pipelineStage === "permitted").length,
    construction: allProjects.filter((p) => p.pipelineStage === "construction").length,
    completed: allProjects.filter((p) => p.pipelineStage === "completed").length,
    totalValuation: allProjects.reduce((sum, p) => sum + (p.valuation || 0), 0),
  };

  // Get unique zones for filter dropdown
  const zones = await prisma.project.findMany({
    where: { zoneCode: { not: null } },
    select: { zoneCode: true },
    distinct: ["zoneCode"],
    orderBy: { zoneCode: "asc" },
  });

  return NextResponse.json({
    projects,
    stats,
    zones: zones.map((z) => z.zoneCode).filter(Boolean),
  });
}
