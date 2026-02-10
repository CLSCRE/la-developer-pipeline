import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";

export async function GET() {
  const runs = await prisma.scrapeRun.findMany({
    orderBy: { startedAt: "desc" },
    take: 20,
  });
  return NextResponse.json(runs);
}
