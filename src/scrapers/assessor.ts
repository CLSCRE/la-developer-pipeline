import { prisma } from "../lib/db";
import { logger } from "../lib/logger";

interface AssessorParcelDetail {
  Parcel: {
    AIN: string;
    UseType: string;
    YearBuilt: string;
    SqftMain: number;
    SqftLot: number;
    NumOfBeds: number;
    NumOfBaths: number;
    CurrentRoll_LandValue: number;
    CurrentRoll_ImpValue: number;
    Exemption: string;
    LegalDescription: string;
    NumOfUnits: number;
  };
}

const ASSESSOR_API = "https://portal.assessor.lacounty.gov/api/parceldetail";

// Rate limit: 2 requests/sec to be respectful
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchAssessorDetail(ain: string): Promise<AssessorParcelDetail | null> {
  try {
    const response = await fetch(`${ASSESSOR_API}?ain=${ain}`, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      logger.warn(`Assessor API returned ${response.status} for AIN ${ain}`);
      return null;
    }

    const data = await response.json();
    if (!data?.Parcel) return null;
    return data as AssessorParcelDetail;
  } catch (error) {
    logger.warn(`Assessor fetch failed for AIN ${ain}: ${error}`);
    return null;
  }
}

export async function enrichProjectFromAssessor(projectId: string): Promise<boolean> {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project?.apn) return false;

  const detail = await fetchAssessorDetail(project.apn);
  if (!detail) return false;

  const p = detail.Parcel;
  await prisma.project.update({
    where: { id: projectId },
    data: {
      assessorUseType: p.UseType || null,
      assessorYearBuilt: p.YearBuilt || null,
      assessorSqftMain: p.SqftMain || null,
      assessorSqftLot: p.SqftLot || null,
      assessorBedrooms: p.NumOfBeds || null,
      assessorBathrooms: p.NumOfBaths || null,
      assessorLandValue: p.CurrentRoll_LandValue || null,
      assessorImpValue: p.CurrentRoll_ImpValue || null,
      assessorExemption: p.Exemption || null,
      assessorLegalDesc: p.LegalDescription || null,
      assessorEnrichedAt: new Date(),
    },
  });

  return true;
}

export async function runAssessorEnrichment(): Promise<{
  total: number;
  enriched: number;
  failed: number;
  skipped: number;
}> {
  const scrapeRun = await prisma.scrapeRun.create({
    data: { source: "assessor", status: "running" },
  });

  try {
    // Get projects with APNs that haven't been enriched yet
    const projects = await prisma.project.findMany({
      where: {
        apn: { not: null },
        assessorEnrichedAt: null,
      },
      select: { id: true, apn: true },
    });

    let enriched = 0;
    let failed = 0;
    let skipped = 0;

    for (let i = 0; i < projects.length; i++) {
      const project = projects[i];
      if (!project.apn) {
        skipped++;
        continue;
      }

      const success = await enrichProjectFromAssessor(project.id);
      if (success) {
        enriched++;
      } else {
        failed++;
      }

      // Log progress every 50 records
      if ((i + 1) % 50 === 0) {
        logger.info(`Assessor enrichment progress: ${i + 1}/${projects.length} (${enriched} enriched, ${failed} failed)`);
      }

      // Rate limit: 500ms between requests
      await delay(500);
    }

    await prisma.scrapeRun.update({
      where: { id: scrapeRun.id },
      data: {
        status: "completed",
        recordsFound: projects.length,
        recordsNew: enriched,
        recordsUpdated: 0,
        completedAt: new Date(),
      },
    });

    logger.info("Assessor enrichment completed", { total: projects.length, enriched, failed, skipped });
    return { total: projects.length, enriched, failed, skipped };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Assessor enrichment failed", { error: message });

    await prisma.scrapeRun.update({
      where: { id: scrapeRun.id },
      data: { status: "failed", errorMessage: message, completedAt: new Date() },
    });

    throw error;
  }
}
