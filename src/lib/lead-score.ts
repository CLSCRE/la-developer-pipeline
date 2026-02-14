import { prisma } from "./db";
import { logger } from "./logger";

export interface LeadScoreBreakdown {
  opportunity: number; // 0-40
  timing: number; // 0-30
  quality: number; // 0-20
  reachability: number; // 0-10
  total: number; // 0-100
  reasoning: string;
}

interface ProjectForScoring {
  id: string;
  permitType: string;
  pipelineStage: string;
  pipelineSubstage: string | null;
  financingType: string;
  valuation: number | null;
  permitDate: Date | null;
  issueDate: Date | null;
  updatedAt: Date;
}

interface DeveloperForScoring {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  projects: ProjectForScoring[];
  outreachLogs: { id: string; createdAt: Date }[];
}

function formatValuation(val: number): string {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
  return `$${val.toLocaleString()}`;
}

function scoreOpportunity(totalValuation: number): number {
  if (totalValuation <= 0) return 0;
  // Log scale: $500K=5, $1M=10, $5M=25, $10M=30, $50M+=40
  const logVal = Math.log10(totalValuation);
  // $500K = log10(500000) ≈ 5.7, $50M = log10(50000000) ≈ 7.7
  const normalized = (logVal - 5.7) / (7.7 - 5.7); // 0 to 1
  return Math.round(Math.min(40, Math.max(0, normalized * 40)));
}

function scoreTiming(projects: ProjectForScoring[]): { score: number; bestStage: string } {
  // Score based on the best (most actionable) project stage
  const stageScores: Record<string, number> = {
    // Permitted = HOT, need construction financing now
    issued: 30,
    // Entitlement late stages = warming up
    ready_to_issue: 22,
    pc_approved: 18,
    plan_check: 12,
    submitted: 8,
    // Construction = may need bridge/perm
    under_inspection: 15,
    cofo_issued: 10,
    // Completed = permanent financing
    finaled: 5,
    expired: 0,
  };

  // Also score by pipelineStage for projects without substages
  const fallbackScores: Record<string, number> = {
    permitted: 30,
    entitlement: 8,
    construction: 15,
    completed: 5,
  };

  let bestScore = 0;
  let bestStage = "unknown";

  for (const p of projects) {
    const substageScore = p.pipelineSubstage ? (stageScores[p.pipelineSubstage] ?? 0) : 0;
    const fallbackScore = fallbackScores[p.pipelineStage] ?? 0;
    const score = Math.max(substageScore, fallbackScore);
    if (score > bestScore) {
      bestScore = score;
      bestStage = p.pipelineSubstage || p.pipelineStage;
    }
  }

  return { score: bestScore, bestStage };
}

function scoreQuality(projects: ProjectForScoring[]): number {
  let score = 0;

  // New construction bonus (+8)
  const hasNewConstruction = projects.some((p) => p.permitType === "Bldg-New");
  if (hasNewConstruction) score += 8;

  // Multiple projects bonus (+2 to +10)
  const activeProjects = projects.filter((p) => p.pipelineStage !== "completed");
  if (activeProjects.length >= 5) score += 10;
  else if (activeProjects.length >= 3) score += 8;
  else if (activeProjects.length >= 2) score += 6;

  // Recent activity bonus (+2) — any project updated in last 90 days
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const hasRecentActivity = projects.some((p) => p.updatedAt > ninetyDaysAgo);
  if (hasRecentActivity) score += 2;

  return Math.min(20, score);
}

function scoreReachability(dev: DeveloperForScoring): number {
  let score = 0;

  // Has contact info
  if (dev.email) score += 4;
  if (dev.phone) score += 3;
  if (dev.linkedinUrl) score += 1;

  // Not recently contacted (bonus for fresh leads)
  if (dev.outreachLogs.length === 0) {
    score += 2; // Never contacted = opportunity
  } else {
    const lastOutreach = dev.outreachLogs.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
    const daysSinceOutreach = Math.floor(
      (Date.now() - new Date(lastOutreach.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceOutreach > 90) score += 2; // Stale — re-engage
  }

  return Math.min(10, score);
}

function buildReasoning(
  dev: DeveloperForScoring,
  totalValuation: number,
  timing: { score: number; bestStage: string },
  hasNewConstruction: boolean
): string {
  const parts: string[] = [];

  // Hotness qualifier
  const totalScore = scoreOpportunity(totalValuation) + timing.score +
    scoreQuality(dev.projects) + scoreReachability(dev);
  if (totalScore >= 70) parts.push("Hot lead:");
  else if (totalScore >= 40) parts.push("Pipeline lead:");
  else parts.push("Early-stage lead:");

  // Valuation
  parts.push(formatValuation(totalValuation));

  // Construction type
  if (hasNewConstruction) parts.push("new construction");
  else parts.push("renovation/alteration");

  // Best timing
  const stageLabels: Record<string, string> = {
    issued: "just issued",
    ready_to_issue: "ready to issue",
    pc_approved: "plan check approved",
    plan_check: "in plan check",
    submitted: "submitted",
    under_inspection: "under inspection",
    permitted: "permitted",
    entitlement: "in entitlement",
    construction: "in construction",
  };
  const stageLabel = stageLabels[timing.bestStage] || timing.bestStage;
  parts.push(`— ${stageLabel}.`);

  // Multiple projects
  const activeCount = dev.projects.filter((p) => p.pipelineStage !== "completed").length;
  if (activeCount > 1) parts.push(`${activeCount} active projects.`);

  // Outreach status
  if (dev.outreachLogs.length === 0) {
    parts.push("Never contacted.");
  } else {
    const lastOutreach = dev.outreachLogs.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
    const daysSince = Math.floor(
      (Date.now() - new Date(lastOutreach.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSince > 90) parts.push(`Last contacted ${daysSince}d ago.`);
    else parts.push(`Contacted ${daysSince}d ago.`);
  }

  return parts.join(" ");
}

export function computeLeadScore(dev: DeveloperForScoring): LeadScoreBreakdown {
  const totalValuation = dev.projects.reduce((sum, p) => sum + (p.valuation || 0), 0);
  const hasNewConstruction = dev.projects.some((p) => p.permitType === "Bldg-New");

  const opportunity = scoreOpportunity(totalValuation);
  const timing = scoreTiming(dev.projects);
  const quality = scoreQuality(dev.projects);
  const reachability = scoreReachability(dev);
  const total = opportunity + timing.score + quality + reachability;

  const reasoning = buildReasoning(dev, totalValuation, timing, hasNewConstruction);

  return {
    opportunity,
    timing: timing.score,
    quality,
    reachability,
    total: Math.min(100, total),
    reasoning,
  };
}

export async function computeAllLeadScores(): Promise<{ updated: number }> {
  const developers = await prisma.developer.findMany({
    include: {
      projects: {
        select: {
          id: true,
          permitType: true,
          pipelineStage: true,
          pipelineSubstage: true,
          financingType: true,
          valuation: true,
          permitDate: true,
          issueDate: true,
          updatedAt: true,
        },
      },
      outreachLogs: {
        select: { id: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  let updated = 0;
  for (const dev of developers) {
    if (dev.projects.length === 0) continue;

    const score = computeLeadScore(dev);

    await prisma.developer.update({
      where: { id: dev.id },
      data: {
        leadScore: score.total,
        leadScoreData: JSON.stringify(score),
        leadScoreAt: new Date(),
      },
    });
    updated++;
  }

  logger.info(`Lead scores computed for ${updated} developers`);
  return { updated };
}
