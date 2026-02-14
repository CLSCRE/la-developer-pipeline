import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  // Pipeline funnel: count projects by stage
  const projects = await prisma.project.findMany({
    select: { pipelineStage: true, zoneCode: true, valuation: true, permitDate: true },
  });

  const funnel: Record<string, number> = { entitlement: 0, permitted: 0, construction: 0, completed: 0 };
  const zones: Record<string, number> = {};
  const monthlyTrend: Record<string, number> = {};

  for (const p of projects) {
    if (funnel[p.pipelineStage] !== undefined) funnel[p.pipelineStage]++;
    if (p.zoneCode) {
      const zone = p.zoneCode.replace(/[-\d]+$/, "").trim() || p.zoneCode;
      zones[zone] = (zones[zone] || 0) + 1;
    }
    if (p.permitDate) {
      const d = new Date(p.permitDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyTrend[key] = (monthlyTrend[key] || 0) + 1;
    }
  }

  // Developer stage funnel
  const developers = await prisma.developer.findMany({
    select: { pipelineStage: true },
  });
  const devFunnel: Record<string, number> = {
    new: 0, contacted: 0, in_discussion: 0, proposal_sent: 0, won: 0, lost: 0, dormant: 0,
  };
  for (const d of developers) {
    if (devFunnel[d.pipelineStage] !== undefined) devFunnel[d.pipelineStage]++;
  }

  // Top developers by project count
  const topDevs = await prisma.developer.findMany({
    include: { _count: { select: { projects: true, outreachLogs: true } } },
    orderBy: { projects: { _count: "desc" } },
    take: 10,
  });

  // Outreach stats
  const outreachLogs = await prisma.outreachLog.findMany({
    select: { type: true, status: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  const outreachByType: Record<string, number> = {};
  const outreachByStatus: Record<string, number> = {};
  for (const log of outreachLogs) {
    outreachByType[log.type] = (outreachByType[log.type] || 0) + 1;
    outreachByStatus[log.status] = (outreachByStatus[log.status] || 0) + 1;
  }

  // Recent activity (last 20 events)
  const recentOutreach = await prisma.outreachLog.findMany({
    include: {
      developer: { select: { id: true, name: true } },
      project: { select: { id: true, address: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const recentScrapes = await prisma.scrapeRun.findMany({
    orderBy: { startedAt: "desc" },
    take: 5,
  });

  // Sort zones by count, take top 10
  const topZones = Object.entries(zones)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  // Sort monthly trend
  const sortedTrend = Object.entries(monthlyTrend).sort(([a], [b]) => a.localeCompare(b));

  return NextResponse.json({
    projectFunnel: funnel,
    devFunnel,
    topZones,
    monthlyTrend: sortedTrend,
    topDevelopers: topDevs.map((d) => ({
      id: d.id,
      name: d.name,
      projects: d._count.projects,
      outreach: d._count.outreachLogs,
    })),
    outreachByType,
    outreachByStatus,
    recentActivity: recentOutreach,
    recentScrapes,
    totals: {
      projects: projects.length,
      developers: developers.length,
      outreach: outreachLogs.length,
    },
  });
}
