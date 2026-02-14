import { prisma } from "../lib/db";
import { logger } from "../lib/logger";
import { fetchAllLADBSPermits, fetchAllOldDatasetPermits, fetchAllSubmittedPermits } from "./ladbs";
import { normalizeName } from "../lib/normalize";

export async function runLADBSScrape(dateFrom?: string): Promise<{
  recordsFound: number;
  recordsNew: number;
  recordsUpdated: number;
}> {
  const scrapeRun = await prisma.scrapeRun.create({
    data: { source: "ladbs", status: "running" },
  });

  try {
    const permits = await fetchAllLADBSPermits(dateFrom);
    let recordsNew = 0;
    let recordsUpdated = 0;

    for (const permit of permits) {
      const existing = await prisma.project.findUnique({
        where: { permitNumber: permit.permitNumber },
      });

      if (existing) {
        await prisma.project.update({
          where: { permitNumber: permit.permitNumber },
          data: {
            status: permit.status,
            pipelineStage: permit.pipelineStage,
            pipelineSubstage: permit.pipelineSubstage,
            financingType: permit.financingType,
            description: permit.description,
            valuation: permit.valuation,
            units: permit.units,
            stories: permit.stories,
            sqft: permit.sqft,
            latitude: permit.latitude,
            longitude: permit.longitude,
            issueDate: permit.issueDate,
            contractor: permit.contractor,
            ownerName: permit.ownerName,
            ownerAddress: permit.ownerAddress,
            apn: permit.apn,
            rawData: permit.rawData,
          },
        });
        recordsUpdated++;
      } else {
        await prisma.project.create({
          data: {
            permitNumber: permit.permitNumber,
            permitType: permit.permitType,
            status: permit.status,
            pipelineStage: permit.pipelineStage,
            pipelineSubstage: permit.pipelineSubstage,
            financingType: permit.financingType,
            address: permit.address,
            description: permit.description,
            valuation: permit.valuation,
            units: permit.units,
            stories: permit.stories,
            sqft: permit.sqft,
            zoneCode: permit.zoneCode,
            apn: permit.apn,
            latitude: permit.latitude,
            longitude: permit.longitude,
            permitDate: permit.permitDate,
            issueDate: permit.issueDate,
            contractor: permit.contractor,
            ownerName: permit.ownerName,
            ownerAddress: permit.ownerAddress,
            rawData: permit.rawData,
            source: "ladbs",
          },
        });
        recordsNew++;
      }
    }

    await prisma.scrapeRun.update({
      where: { id: scrapeRun.id },
      data: {
        status: "completed",
        recordsFound: permits.length,
        recordsNew,
        recordsUpdated,
        completedAt: new Date(),
      },
    });

    // Auto-match unlinked projects to existing developers by normalized owner name
    await autoLinkDevelopers();

    logger.info("LADBS scrape completed", { recordsFound: permits.length, recordsNew, recordsUpdated });
    return { recordsFound: permits.length, recordsNew, recordsUpdated };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("LADBS scrape failed", { error: message });

    await prisma.scrapeRun.update({
      where: { id: scrapeRun.id },
      data: {
        status: "failed",
        errorMessage: message,
        completedAt: new Date(),
      },
    });

    throw error;
  }
}

// Scrape submitted permits (pre-issuance entitlement stage)
export async function runSubmittedScrape(): Promise<{
  recordsFound: number;
  recordsNew: number;
  recordsUpdated: number;
}> {
  const scrapeRun = await prisma.scrapeRun.create({
    data: { source: "ladbs-submitted", status: "running" },
  });

  try {
    const permits = await fetchAllSubmittedPermits(500000);
    let recordsNew = 0;
    let recordsUpdated = 0;

    for (const permit of permits) {
      const existing = await prisma.project.findUnique({
        where: { permitNumber: permit.permitNumber },
      });

      if (existing) {
        // Update status/substage if the submitted data is more granular
        await prisma.project.update({
          where: { permitNumber: permit.permitNumber },
          data: {
            status: permit.status,
            pipelineStage: permit.pipelineStage,
            pipelineSubstage: permit.pipelineSubstage,
            financingType: permit.financingType,
            description: permit.description || existing.description,
            valuation: permit.valuation || existing.valuation,
            latitude: permit.latitude || existing.latitude,
            longitude: permit.longitude || existing.longitude,
            apn: permit.apn || existing.apn,
            zoneCode: permit.zoneCode || existing.zoneCode,
          },
        });
        recordsUpdated++;
      } else {
        await prisma.project.create({
          data: {
            permitNumber: permit.permitNumber,
            permitType: permit.permitType,
            status: permit.status,
            pipelineStage: permit.pipelineStage,
            pipelineSubstage: permit.pipelineSubstage,
            financingType: permit.financingType,
            address: permit.address,
            description: permit.description,
            valuation: permit.valuation,
            zoneCode: permit.zoneCode,
            apn: permit.apn,
            latitude: permit.latitude,
            longitude: permit.longitude,
            permitDate: permit.permitDate,
            rawData: permit.rawData,
            source: "ladbs-submitted",
          },
        });
        recordsNew++;
      }
    }

    await prisma.scrapeRun.update({
      where: { id: scrapeRun.id },
      data: {
        status: "completed",
        recordsFound: permits.length,
        recordsNew,
        recordsUpdated,
        completedAt: new Date(),
      },
    });

    await autoLinkDevelopers();

    logger.info("Submitted scrape completed", { recordsFound: permits.length, recordsNew, recordsUpdated });
    return { recordsFound: permits.length, recordsNew, recordsUpdated };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Submitted scrape failed", { error: message });

    await prisma.scrapeRun.update({
      where: { id: scrapeRun.id },
      data: {
        status: "failed",
        errorMessage: message,
        completedAt: new Date(),
      },
    });

    throw error;
  }
}

// Full scrape: issued permits + submitted permits + old dataset enrichment
export async function runFullScrape(dateFrom?: string): Promise<{
  issued: { recordsFound: number; recordsNew: number; recordsUpdated: number };
  submitted: { recordsFound: number; recordsNew: number; recordsUpdated: number };
  enrichment: { matched: number; enriched: number; developersCreated: number } | null;
}> {
  const issued = await runLADBSScrape(dateFrom);
  const submitted = await runSubmittedScrape();
  const enrichment = await enrichFromOldDataset();
  return { issued, submitted, enrichment };
}

// Enrich existing projects with contractor/applicant data from old LADBS dataset
export async function enrichFromOldDataset(): Promise<{
  matched: number;
  enriched: number;
  developersCreated: number;
}> {
  const scrapeRun = await prisma.scrapeRun.create({
    data: { source: "ladbs-old", status: "running" },
  });

  try {
    logger.info("Fetching old LADBS dataset for contractor/applicant enrichment");
    const oldPermits = await fetchAllOldDatasetPermits(500000);

    let matched = 0;
    let enriched = 0;

    // Build a map of permit numbers from old dataset
    const oldPermitMap = new Map<string, typeof oldPermits[0]>();
    for (const p of oldPermits) {
      if (p.permitNumber) {
        oldPermitMap.set(p.permitNumber, p);
      }
    }

    logger.info(`Old dataset loaded: ${oldPermitMap.size} permits`);

    // Match with existing projects and enrich
    const existingProjects = await prisma.project.findMany({
      select: { id: true, permitNumber: true, contractor: true, ownerName: true },
    });

    for (const proj of existingProjects) {
      const oldData = oldPermitMap.get(proj.permitNumber);
      if (!oldData) continue;
      matched++;

      // Only update if we have new data
      const updates: Record<string, string | null> = {};
      if (oldData.contractor && !proj.contractor) updates.contractor = oldData.contractor;
      if (oldData.ownerName && !proj.ownerName) updates.ownerName = oldData.ownerName;
      if (oldData.ownerAddress) updates.ownerAddress = oldData.ownerAddress;

      if (Object.keys(updates).length > 0) {
        await prisma.project.update({
          where: { id: proj.id },
          data: updates,
        });
        enriched++;
      }
    }

    // Also import permits that don't exist yet from old dataset
    let newFromOld = 0;
    for (const permit of oldPermits) {
      const exists = await prisma.project.findUnique({
        where: { permitNumber: permit.permitNumber },
        select: { id: true },
      });
      if (!exists && permit.valuation && permit.valuation >= 500000) {
        await prisma.project.create({
          data: {
            permitNumber: permit.permitNumber,
            permitType: permit.permitType,
            status: permit.status,
            pipelineStage: permit.pipelineStage,
            pipelineSubstage: permit.pipelineSubstage,
            financingType: permit.financingType,
            address: permit.address,
            description: permit.description,
            valuation: permit.valuation,
            latitude: permit.latitude,
            longitude: permit.longitude,
            permitDate: permit.permitDate,
            issueDate: permit.issueDate,
            contractor: permit.contractor,
            ownerName: permit.ownerName,
            ownerAddress: permit.ownerAddress,
            rawData: permit.rawData,
            source: "ladbs-old",
          },
        });
        newFromOld++;
      }
    }

    // Create developers from unique contractor/applicant names
    const developersCreated = await createDevelopersFromPermitData();

    await prisma.scrapeRun.update({
      where: { id: scrapeRun.id },
      data: {
        status: "completed",
        recordsFound: oldPermits.length,
        recordsNew: newFromOld,
        recordsUpdated: enriched,
        completedAt: new Date(),
      },
    });

    logger.info("Old dataset enrichment completed", { matched, enriched, newFromOld, developersCreated });
    return { matched, enriched, developersCreated };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Old dataset enrichment failed", { error: message });

    await prisma.scrapeRun.update({
      where: { id: scrapeRun.id },
      data: {
        status: "failed",
        errorMessage: message,
        completedAt: new Date(),
      },
    });

    throw error;
  }
}

// Create developer profiles from contractor/applicant names on projects
async function createDevelopersFromPermitData(): Promise<number> {
  const projects = await prisma.project.findMany({
    where: {
      developerId: null,
      OR: [
        { contractor: { not: null } },
        { ownerName: { not: null } },
      ],
    },
    select: { id: true, contractor: true, ownerName: true, ownerAddress: true, address: true, valuation: true },
  });

  // Group by normalized name to deduplicate
  const nameGroups = new Map<string, { name: string; address: string | null; projectIds: string[]; totalValuation: number }>();

  for (const p of projects) {
    // Prefer ownerName (applicant), fall back to contractor
    const name = p.ownerName || p.contractor;
    if (!name || name.length < 3) continue;

    const normalized = normalizeName(name);
    if (!normalized || normalized.length < 2) continue;

    const existing = nameGroups.get(normalized);
    if (existing) {
      existing.projectIds.push(p.id);
      existing.totalValuation += p.valuation || 0;
    } else {
      nameGroups.set(normalized, {
        name,
        address: p.ownerAddress || p.address,
        projectIds: [p.id],
        totalValuation: p.valuation || 0,
      });
    }
  }

  let created = 0;

  // Check for existing developers to avoid duplicates
  const existingDevs = await prisma.developer.findMany({
    select: { id: true, normalizedName: true },
  });
  const existingNormalized = new Set(existingDevs.map(d => d.normalizedName));

  for (const [normalized, group] of Array.from(nameGroups.entries())) {
    // Skip if developer already exists
    if (existingNormalized.has(normalized)) {
      // Link projects to existing developer
      const dev = existingDevs.find(d => d.normalizedName === normalized);
      if (dev) {
        await prisma.project.updateMany({
          where: { id: { in: group.projectIds } },
          data: { developerId: dev.id },
        });
      }
      continue;
    }

    // Detect entity type from the raw name
    const entityType = detectEntityType(group.name);

    const dev = await prisma.developer.create({
      data: {
        name: group.name,
        normalizedName: normalized,
        entityType,
        address: group.address,
        pipelineStage: "new",
        notes: `${group.projectIds.length} permit(s), ~$${Math.round(group.totalValuation).toLocaleString()} total valuation. Auto-created from permit data.`,
      },
    });

    await prisma.project.updateMany({
      where: { id: { in: group.projectIds } },
      data: { developerId: dev.id },
    });

    created++;
  }

  logger.info(`Created ${created} developers from permit data`);
  return created;
}

function detectEntityType(name: string): string {
  const upper = name.toUpperCase();
  if (/\bLLC\b/.test(upper) || /L\.L\.C/.test(upper)) return "LLC";
  if (/\bINC\b/.test(upper) || /\bCORP\b/.test(upper) || /\bCORPORATION\b/.test(upper)) return "Corporation";
  if (/\b(LP|LLP|L\.P\.)\b/.test(upper)) return "LP";
  if (/\bTRUST\b/.test(upper)) return "Trust";
  if (/\bCO\b/.test(upper) || /\bCOMPANY\b/.test(upper)) return "Company";
  return "Individual";
}

async function autoLinkDevelopers() {
  const unlinked = await prisma.project.findMany({
    where: { developerId: null, ownerName: { not: null } },
    select: { id: true, ownerName: true },
  });
  const developers = await prisma.developer.findMany({
    select: { id: true, normalizedName: true },
  });
  let autoLinked = 0;
  for (const proj of unlinked) {
    if (!proj.ownerName) continue;
    const normalized = normalizeName(proj.ownerName);
    const match = developers.find((d) => d.normalizedName === normalized);
    if (match) {
      await prisma.project.update({
        where: { id: proj.id },
        data: { developerId: match.id },
      });
      autoLinked++;
    }
  }
  if (autoLinked > 0) {
    logger.info("Auto-linked projects to developers", { autoLinked });
  }
}
