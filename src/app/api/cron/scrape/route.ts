import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runFullScrape } from "@/scrapers/scrape-runner";
import { runAssessorEnrichment } from "@/scrapers/assessor";
import { computeAllLeadScores } from "@/lib/lead-score";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 401 });
  }

  // Validate token against stored secret
  const secretSetting = await prisma.appSetting.findUnique({
    where: { key: "cron_secret" },
  });

  if (!secretSetting || secretSetting.value !== token) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // Check if cron is enabled
  const enabledSetting = await prisma.appSetting.findUnique({
    where: { key: "cron_enabled" },
  });

  if (!enabledSetting || enabledSetting.value !== "true") {
    return NextResponse.json({ error: "Cron is disabled" }, { status: 403 });
  }

  try {
    const scrapeResult = await runFullScrape();
    const assessorResult = await runAssessorEnrichment();
    const scoresResult = await computeAllLeadScores();

    // Update last run timestamp
    await prisma.appSetting.upsert({
      where: { key: "cron_last_run" },
      update: { value: new Date().toISOString() },
      create: { key: "cron_last_run", value: new Date().toISOString() },
    });

    return NextResponse.json({
      success: true,
      scrape: scrapeResult,
      assessor: assessorResult,
      scores: scoresResult,
      completedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
