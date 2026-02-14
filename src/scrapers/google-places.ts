import { prisma } from "../lib/db";
import { logger } from "../lib/logger";
import { config } from "../lib/config";

interface GooglePlacesResult {
  displayName?: { text: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchGooglePlacesInfo(
  businessName: string,
  apiKey: string
): Promise<GooglePlacesResult | null> {
  try {
    const response = await fetch(config.googlePlaces.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.googleMapsUri",
      },
      body: JSON.stringify({
        textQuery: `${businessName} Los Angeles`,
      }),
    });

    if (!response.ok) {
      logger.warn(`Google Places API returned ${response.status} for "${businessName}"`);
      return null;
    }

    const data = await response.json();
    const places = data.places;

    if (!places || places.length === 0) {
      return null;
    }

    // Return the first (most relevant) result
    return places[0] as GooglePlacesResult;
  } catch (error) {
    logger.warn(`Google Places fetch failed for "${businessName}": ${error}`);
    return null;
  }
}

export async function enrichDeveloperFromGooglePlaces(
  developerId: string,
  apiKey: string
): Promise<boolean> {
  const developer = await prisma.developer.findUnique({
    where: { id: developerId },
  });

  if (!developer) return false;

  const info = await fetchGooglePlacesInfo(developer.name, apiKey);
  if (!info) return false;

  // Only fill null fields — don't overwrite existing data
  const updates: Record<string, string | null> = {};

  if (!developer.phone && info.nationalPhoneNumber) {
    updates.phone = info.nationalPhoneNumber;
  }
  if (!developer.website && info.websiteUri) {
    updates.website = info.websiteUri;
  }
  if (!developer.address && info.formattedAddress) {
    updates.address = info.formattedAddress;
  }
  if (info.googleMapsUri) {
    updates.googlePlacesUrl = info.googleMapsUri;
  }

  if (Object.keys(updates).length > 0) {
    await prisma.developer.update({
      where: { id: developerId },
      data: updates,
    });
    return true;
  }

  return false;
}

export async function runGooglePlacesEnrichment(apiKey: string): Promise<{
  total: number;
  enriched: number;
  failed: number;
  skipped: number;
}> {
  const scrapeRun = await prisma.scrapeRun.create({
    data: { source: "google-places", status: "running" },
  });

  try {
    // Get developers that haven't been contact-enriched
    const developers = await prisma.developer.findMany({
      where: {
        contactEnrichedAt: null,
      },
      select: { id: true, name: true },
    });

    let enriched = 0;
    let failed = 0;
    const skipped = 0;

    for (let i = 0; i < developers.length; i++) {
      const dev = developers[i];

      const success = await enrichDeveloperFromGooglePlaces(dev.id, apiKey);
      if (success) {
        enriched++;
      } else {
        failed++;
      }

      // Log progress every 50 records
      if ((i + 1) % 50 === 0) {
        logger.info(
          `Google Places enrichment progress: ${i + 1}/${developers.length} (${enriched} enriched, ${failed} failed)`
        );
      }

      // Rate limit: 1s between requests
      await delay(1000);
    }

    // Mark all processed developers as contact-enriched
    await prisma.developer.updateMany({
      where: {
        id: { in: developers.map((d) => d.id) },
        contactEnrichedAt: null,
      },
      data: { contactEnrichedAt: new Date() },
    });

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

    logger.info("Google Places enrichment completed", {
      total: developers.length,
      enriched,
      failed,
      skipped,
    });
    return { total: developers.length, enriched, failed, skipped };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Google Places enrichment failed", { error: message });

    await prisma.scrapeRun.update({
      where: { id: scrapeRun.id },
      data: { status: "failed", errorMessage: message, completedAt: new Date() },
    });

    throw error;
  }
}
