import { prisma } from "../lib/db";
import { logger } from "../lib/logger";
import { config } from "../lib/config";

interface SOSBusinessInfo {
  entityNumber: string | null;
  entityName: string | null;
  status: string | null;
  registrationDate: string | null;
  agentName: string | null;
  agentAddress: string | null;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchSOSBusinessInfo(entityName: string): Promise<SOSBusinessInfo | null> {
  try {
    const params = new URLSearchParams({
      SearchType: "CORP",
      SearchCriteria: entityName,
      SearchSubType: "Keyword",
    });

    const response = await fetch(config.sos.searchUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      logger.warn(`SOS search returned ${response.status} for "${entityName}"`);
      return null;
    }

    const html = await response.text();

    // Parse the HTML response for entity info
    // The SOS search results page contains a table with entity details
    const result: SOSBusinessInfo = {
      entityNumber: null,
      entityName: null,
      status: null,
      registrationDate: null,
      agentName: null,
      agentAddress: null,
    };

    // Extract entity number (format: Cxxxxxxx or similar)
    const entityNumMatch = html.match(/Entity Number[^<]*<[^>]*>([^<]+)/i) ||
      html.match(/data-entity="([^"]+)"/i) ||
      html.match(/EntityId=([A-Z0-9]+)/i);
    if (entityNumMatch) result.entityNumber = entityNumMatch[1].trim();

    // Extract status
    const statusMatch = html.match(/Status[^<]*<[^>]*>([^<]+)/i);
    if (statusMatch) result.status = statusMatch[1].trim();

    // Extract registration date
    const regDateMatch = html.match(/Registration Date[^<]*<[^>]*>([^<]+)/i) ||
      html.match(/Formation Date[^<]*<[^>]*>([^<]+)/i);
    if (regDateMatch) result.registrationDate = regDateMatch[1].trim();

    // Extract agent name from the first result row if available
    const agentMatch = html.match(/Agent for Service of Process[^<]*<[^>]*>([^<]+)/i);
    if (agentMatch) result.agentName = agentMatch[1].trim();

    // Extract agent address
    const agentAddrMatch = html.match(/Agent Address[^<]*<[^>]*>([^<]+)/i);
    if (agentAddrMatch) result.agentAddress = agentAddrMatch[1].trim();

    // Only return if we found at least an entity number or status
    if (result.entityNumber || result.status) {
      return result;
    }

    return null;
  } catch (error) {
    logger.warn(`SOS fetch failed for "${entityName}": ${error}`);
    return null;
  }
}

export async function enrichDeveloperFromSOS(developerId: string): Promise<boolean> {
  const developer = await prisma.developer.findUnique({
    where: { id: developerId },
  });

  if (!developer) return false;

  const info = await fetchSOSBusinessInfo(developer.name);
  if (!info) return false;

  const updates: Record<string, string | null> = {};
  if (info.entityNumber) updates.sosEntityNumber = info.entityNumber;
  if (info.status) updates.sosStatus = info.status;
  if (info.registrationDate) updates.sosRegistrationDate = info.registrationDate;
  if (info.agentName) updates.sosAgentName = info.agentName;
  if (info.agentAddress) updates.sosAgentAddress = info.agentAddress;

  if (Object.keys(updates).length > 0) {
    await prisma.developer.update({
      where: { id: developerId },
      data: updates,
    });
    return true;
  }

  return false;
}

export async function runSOSEnrichment(): Promise<{
  total: number;
  enriched: number;
  failed: number;
  skipped: number;
}> {
  const scrapeRun = await prisma.scrapeRun.create({
    data: { source: "sos", status: "running" },
  });

  try {
    // Get non-Individual developers that haven't been contact-enriched
    const developers = await prisma.developer.findMany({
      where: {
        contactEnrichedAt: null,
        entityType: { not: "Individual" },
      },
      select: { id: true, name: true, entityType: true },
    });

    let enriched = 0;
    let failed = 0;
    let skipped = 0;

    for (let i = 0; i < developers.length; i++) {
      const dev = developers[i];

      // Skip individuals (shouldn't be here, but just in case)
      if (dev.entityType === "Individual") {
        skipped++;
        continue;
      }

      const success = await enrichDeveloperFromSOS(dev.id);
      if (success) {
        enriched++;
      } else {
        failed++;
      }

      // Log progress every 50 records
      if ((i + 1) % 50 === 0) {
        logger.info(`SOS enrichment progress: ${i + 1}/${developers.length} (${enriched} enriched, ${failed} failed)`);
      }

      // Rate limit: 500ms between requests
      await delay(500);
    }

    await prisma.scrapeRun.update({
      where: { id: scrapeRun.id },
      data: {
        status: "completed",
        recordsFound: developers.length,
        recordsNew: enriched,
        recordsUpdated: 0,
        completedAt: new Date(),
      },
    });

    logger.info("SOS enrichment completed", { total: developers.length, enriched, failed, skipped });
    return { total: developers.length, enriched, failed, skipped };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("SOS enrichment failed", { error: message });

    await prisma.scrapeRun.update({
      where: { id: scrapeRun.id },
      data: { status: "failed", errorMessage: message, completedAt: new Date() },
    });

    throw error;
  }
}
