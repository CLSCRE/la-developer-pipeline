import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  // Hot leads (score >= 70)
  const hotLeads = await prisma.developer.findMany({
    where: { leadScore: { gte: 70 }, projects: { some: {} } },
    include: {
      projects: {
        select: {
          valuation: true,
          pipelineStage: true,
          pipelineSubstage: true,
          permitType: true,
          financingType: true,
          address: true,
        },
      },
      outreachLogs: { select: { id: true }, take: 1 },
    },
    orderBy: { leadScore: "desc" },
    take: 5,
  });

  // Pipeline value (all scored devs)
  const allDevs = await prisma.developer.findMany({
    where: { leadScore: { not: null }, projects: { some: {} } },
    select: {
      leadScore: true,
      projects: { select: { valuation: true, financingType: true, pipelineStage: true } },
      outreachLogs: { select: { id: true }, take: 1 },
    },
  });

  const hotCount = allDevs.filter((d) => (d.leadScore || 0) >= 70).length;
  const uncontactedHotCount = allDevs.filter(
    (d) => (d.leadScore || 0) >= 70 && d.outreachLogs.length === 0
  ).length;

  // Total pipeline and opportunity values
  let totalOpportunity = 0;
  let pipelineValue = 0;
  const financingBreakdown = { predevelopment: 0, construction: 0, bridge: 0, permanent: 0 };

  for (const dev of allDevs) {
    for (const p of dev.projects) {
      const val = p.valuation || 0;
      totalOpportunity += val;
      if (p.pipelineStage !== "completed") pipelineValue += val;
      const ft = p.financingType as keyof typeof financingBreakdown;
      if (ft in financingBreakdown) financingBreakdown[ft] += val;
    }
  }

  // Top 5 hot leads with enriched data
  const topHotLeads = hotLeads.map((dev) => ({
    id: dev.id,
    name: dev.name,
    leadScore: dev.leadScore,
    leadScoreData: dev.leadScoreData ? JSON.parse(dev.leadScoreData) : null,
    totalValuation: dev.projects.reduce((sum, p) => sum + (p.valuation || 0), 0),
    projectCount: dev.projects.length,
    hasNewConstruction: dev.projects.some((p) => p.permitType === "Bldg-New"),
    contacted: dev.outreachLogs.length > 0,
  }));

  // Pipeline movers — recently updated projects that advanced in stage
  const recentProjects = await prisma.project.findMany({
    where: {
      pipelineStage: { in: ["permitted", "entitlement"] },
      pipelineSubstage: { in: ["issued", "ready_to_issue", "pc_approved"] },
      updatedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
    include: {
      developer: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 10,
  });

  const pipelineMovers = recentProjects.map((p) => ({
    id: p.id,
    address: p.address,
    permitType: p.permitType,
    pipelineStage: p.pipelineStage,
    pipelineSubstage: p.pipelineSubstage,
    valuation: p.valuation,
    developer: p.developer ? { id: p.developer.id, name: p.developer.name } : null,
    updatedAt: p.updatedAt,
  }));

  // Recent activity
  const recentOutreach = await prisma.outreachLog.findMany({
    include: {
      developer: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const recentActivity = recentOutreach.map((log) => ({
    id: log.id,
    type: log.type,
    subject: log.subject,
    developer: { id: log.developer.id, name: log.developer.name },
    createdAt: log.createdAt,
  }));

  return NextResponse.json({
    cards: {
      hotLeads: hotCount,
      pipelineValue,
      uncontactedHotLeads: uncontactedHotCount,
      totalOpportunity,
    },
    topHotLeads,
    pipelineMovers,
    financingBreakdown,
    recentActivity,
  });
}
