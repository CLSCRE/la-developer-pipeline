import { NextRequest, NextResponse } from "next/server";
import { enrichProjectFromAssessor, runAssessorEnrichment } from "../../../../scrapers/assessor";

// POST /api/enrich/assessor — enrich a single project or run batch
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const projectId = body.projectId as string | undefined;

    if (projectId) {
      // Single project enrichment
      const success = await enrichProjectFromAssessor(projectId);
      if (success) {
        return NextResponse.json({ success: true });
      }
      return NextResponse.json({ error: "Failed to enrich — no APN or assessor data unavailable" }, { status: 400 });
    }

    // Batch enrichment
    const result = await runAssessorEnrichment();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
