import { NextRequest, NextResponse } from "next/server";
import { findPotentialDuplicates, mergeDevelopers } from "@/lib/dedup";

export async function GET() {
  try {
    const pairs = await findPotentialDuplicates();
    return NextResponse.json({ pairs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { primaryId, secondaryId } = await request.json();

    if (!primaryId || !secondaryId) {
      return NextResponse.json(
        { error: "primaryId and secondaryId are required" },
        { status: 400 }
      );
    }

    await mergeDevelopers(primaryId, secondaryId);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
