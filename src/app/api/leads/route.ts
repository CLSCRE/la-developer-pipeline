import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const filter = searchParams.get("filter") || "all"; // hot, pipeline, all
  const sort = searchParams.get("sort") || "leadScore";
  const order = searchParams.get("order") === "asc" ? "asc" : "desc";
  const limit = parseInt(searchParams.get("limit") || "100");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    projects: { some: {} }, // Only developers with projects
  };

  if (filter === "hot") {
    where.leadScore = { gte: 70 };
  } else if (filter === "pipeline") {
    where.leadScore = { gte: 40, lt: 70 };
  }

  const developers = await prisma.developer.findMany({
    where,
    include: {
      projects: {
        select: {
          id: true,
          permitType: true,
          pipelineStage: true,
          pipelineSubstage: true,
          financingType: true,
          valuation: true,
          address: true,
        },
      },
      outreachLogs: {
        select: { id: true, createdAt: true, type: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      _count: { select: { projects: true, outreachLogs: true } },
    },
    orderBy: sort === "leadScore" ? { leadScore: order } : { [sort]: order },
    take: limit,
  });

  // Compute aggregate stats
  const allScoredDevs = await prisma.developer.findMany({
    where: { projects: { some: {} }, leadScore: { not: null } },
    select: {
      leadScore: true,
      projects: { select: { valuation: true, pipelineStage: true } },
      outreachLogs: { select: { id: true }, take: 1 },
    },
  });

  const hotCount = allScoredDevs.filter((d) => (d.leadScore || 0) >= 70).length;
  const pipelineCount = allScoredDevs.filter((d) => (d.leadScore || 0) >= 40 && (d.leadScore || 0) < 70).length;
  const uncontactedHotCount = allScoredDevs.filter(
    (d) => (d.leadScore || 0) >= 70 && d.outreachLogs.length === 0
  ).length;
  const totalOpportunity = allScoredDevs.reduce(
    (sum, d) => sum + d.projects.reduce((s, p) => s + (p.valuation || 0), 0),
    0
  );

  // Enrich developer data with computed fields
  const leads = developers.map((dev) => {
    const totalValuation = dev.projects.reduce((sum, p) => sum + (p.valuation || 0), 0);
    const hotProjects = dev.projects.filter(
      (p) => p.pipelineStage === "permitted" || p.pipelineSubstage === "ready_to_issue"
    ).length;
    const pipelineProjects = dev.projects.filter(
      (p) => p.pipelineStage === "entitlement"
    ).length;
    const lastOutreach = dev.outreachLogs[0] || null;

    return {
      id: dev.id,
      name: dev.name,
      email: dev.email,
      phone: dev.phone,
      leadScore: dev.leadScore,
      leadScoreData: dev.leadScoreData ? JSON.parse(dev.leadScoreData) : null,
      totalValuation,
      hotProjects,
      pipelineProjects,
      totalProjects: dev.projects.length,
      lastOutreach: lastOutreach
        ? { date: lastOutreach.createdAt, type: lastOutreach.type }
        : null,
      projects: dev.projects,
    };
  });

  return NextResponse.json({
    leads,
    stats: {
      hotCount,
      pipelineCount,
      uncontactedHotCount,
      totalOpportunity,
      totalLeads: allScoredDevs.length,
    },
  });
}
