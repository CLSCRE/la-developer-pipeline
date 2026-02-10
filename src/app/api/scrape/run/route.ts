import { NextResponse } from "next/server";
import { runLADBSScrape } from "../../../../scrapers/scrape-runner";

export async function POST() {
  try {
    const result = await runLADBSScrape();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
