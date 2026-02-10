import { prisma } from "../lib/db";
import { logger } from "../lib/logger";
import { fetchAllLADBSPermits } from "./ladbs";

export async function runLADBSScrape(): Promise<{
  recordsFound: number;
  recordsNew: number;
  recordsUpdated: number;
}> {
  const scrapeRun = await prisma.scrapeRun.create({
    data: { source: "ladbs", status: "running" },
  });

  try {
    const permits = await fetchAllLADBSPermits();
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
