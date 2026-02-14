import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { enrichDeveloperFromSOS, runSOSEnrichment } from "@/scrapers/sos";
import {
  enrichDeveloperFromGooglePlaces,
  runGooglePlacesEnrichment,
} from "@/scrapers/google-places";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { developerId } = body;

    // Get Google Places API key from settings
    const apiKeySetting = await prisma.appSetting.findUnique({
      where: { key: "google_places_api_key" },
    });
    const apiKey = apiKeySetting?.value;

    // Single developer enrichment
    if (developerId) {
      const sosResult = await enrichDeveloperFromSOS(developerId);

      let googleResult = false;
      if (apiKey) {
        googleResult = await enrichDeveloperFromGooglePlaces(developerId, apiKey);
      }

      // Mark as contact-enriched
      await prisma.developer.update({
        where: { id: developerId },
        data: { contactEnrichedAt: new Date() },
      });

      return NextResponse.json({
        developerId,
        sos: sosResult,
        googlePlaces: googleResult,
      });
    }

    // Batch enrichment
    const sosResult = await runSOSEnrichment();

    let googleResult = null;
    if (apiKey) {
      googleResult = await runGooglePlacesEnrichment(apiKey);
    }

    return NextResponse.json({
      sos: sosResult,
      googlePlaces: googleResult,
      note: !apiKey
        ? "Google Places skipped — no API key configured in Settings"
        : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
