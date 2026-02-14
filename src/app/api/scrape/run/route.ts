import { NextRequest, NextResponse } from "next/server";
import { runLADBSScrape, enrichFromOldDataset, runSubmittedScrape, runFullScrape } from "../../../../scrapers/scrape-runner";
import { computeAllLeadScores } from "@/lib/lead-score";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { dateFrom, includeOldDataset, includeSubmitted, fullScrape } = body;

    // Full scrape: all datasets + lead score recompute
    if (fullScrape) {
      const result = await runFullScrape(dateFrom || undefined);
      const scores = await computeAllLeadScores();
      return NextResponse.json({ ...result, scores });
    }

    // Run the main scrape (new dataset: 2020-present)
    const result = await runLADBSScrape(dateFrom || undefined);

    // Optionally also pull from old dataset for contractor/applicant enrichment
    let enrichResult = null;
    if (includeOldDataset) {
      enrichResult = await enrichFromOldDataset();
    }

    // Optionally pull submitted permits (entitlement pipeline)
    let submittedResult = null;
    if (includeSubmitted) {
      submittedResult = await runSubmittedScrape();
    }

    // Recompute lead scores after any scrape
    const scores = await computeAllLeadScores();

    return NextResponse.json({
      ...result,
      enrichment: enrichResult,
      submitted: submittedResult,
      scores,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
