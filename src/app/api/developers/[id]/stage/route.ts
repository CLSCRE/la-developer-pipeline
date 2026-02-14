import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const VALID_STAGES = ["new", "contacted", "in_discussion", "proposal_sent", "won", "lost", "dormant"];

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { stage } = await request.json();

  if (!VALID_STAGES.includes(stage)) {
    return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
  }

  const developer = await prisma.developer.update({
    where: { id },
    data: { pipelineStage: stage },
  });

  return NextResponse.json(developer);
}
