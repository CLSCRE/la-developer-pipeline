import { NextResponse } from "next/server";
import { computeAllLeadScores } from "@/lib/lead-score";

export async function POST() {
  try {
    const result = await computeAllLeadScores();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
